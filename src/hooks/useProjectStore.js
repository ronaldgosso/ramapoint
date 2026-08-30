import { openDB } from 'idb'

const OLD_DB_NAME = 'campass-map-creator'
const DB_NAME = 'ramapoint_db'
const DB_VERSION = 2
const STORE_NAME = 'projects'

let dbPromise = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // v1: Initial schema
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
            store.createIndex('updatedAt', 'updatedAt')
            store.createIndex('name', 'name')
          }
        }
        // v2: Ensure every project has a description field (backfill)
        if (oldVersion >= 1 && oldVersion < 2) {
          const store = transaction.objectStore(STORE_NAME)
          // openCursor is async; we chain a promise on the transaction
          store.openCursor().then(function migrate(cursor) {
            if (!cursor) return
            const project = cursor.value
            if (project.description === undefined) {
              cursor.update({ ...project, description: '' })
            }
            cursor.continue().then(migrate)
          }).catch(() => {})
        }
      },
    })
  }
  return dbPromise
}

async function migrateOldDb() {
  try {
    const migrated = localStorage.getItem('ramapoint_db_migrated')
    if (migrated) return

    if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
      const dbs = await indexedDB.databases()
      const oldDbExists = dbs.some(db => db.name === OLD_DB_NAME)
      if (!oldDbExists) {
        localStorage.setItem('ramapoint_db_migrated', 'true')
        return
      }
    }

    const oldDb = await openDB(OLD_DB_NAME, DB_VERSION).catch(() => null)
    if (!oldDb) {
      localStorage.setItem('ramapoint_db_migrated', 'true')
      return
    }

    const projects = await oldDb.getAll(STORE_NAME).catch(() => [])
    if (projects && projects.length > 0) {
      const newDb = await getDb()
      for (const project of projects) {
        await newDb.put(STORE_NAME, project).catch(() => {})
      }
    }
    oldDb.close()
    localStorage.setItem('ramapoint_db_migrated', 'true')
  } catch (err) {
    console.error('Migration of old indexedDB failed:', err)
  }
}

export async function getAllProjects() {
  await migrateOldDb()
  const db = await getDb()
  return db.getAllFromIndex(STORE_NAME, 'updatedAt')
}

export async function getProject(id) {
  const db = await getDb()
  return db.get(STORE_NAME, id)
}

function generateThumbnailSVG(project) {
  const coords = []

  if (project.features && Array.isArray(project.features)) {
    project.features.forEach((f) => {
      const type = f.geometry?.type
      const c = f.geometry?.coordinates
      if (!c) return
      if (type === 'Point' && Array.isArray(c)) {
        coords.push(c)
      } else if (type === 'LineString' && Array.isArray(c)) {
        c.forEach(pt => { if (Array.isArray(pt)) coords.push(pt) })
      } else if (type === 'Polygon' && Array.isArray(c) && Array.isArray(c[0])) {
        c[0].forEach(pt => { if (Array.isArray(pt)) coords.push(pt) })
      }
    })
  }

  if (project.routingNodes && Array.isArray(project.routingNodes)) {
    project.routingNodes.forEach((n) => {
      if (typeof n.lng === 'number' && typeof n.lat === 'number') {
        coords.push([n.lng, n.lat])
      }
    })
  }

  if (coords.length === 0) return null

  const lngs = coords.map(pt => pt[0])
  const lats = coords.map(pt => pt[1])

  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)

  const dLng = maxLng - minLng || 0.0001
  const dLat = maxLat - minLat || 0.0001

  const padding = 6
  const width = 100
  const height = 60

  const scaleX = (lng) => padding + ((lng - minLng) / dLng) * (width - 2 * padding)
  const scaleY = (lat) => height - padding - ((lat - minLat) / dLat) * (height - 2 * padding)

  const elements = []

  if (project.features && Array.isArray(project.features)) {
    project.features.forEach((f) => {
      const type = f.geometry?.type
      const c = f.geometry?.coordinates
      if (!c) return

      const color = f.color || '#B8F7E4'
      const strokeColor = f.strokeColor || '#7BE8C9'

      if (type === 'Point' && Array.isArray(c)) {
        const cx = scaleX(c[0])
        const cy = scaleY(c[1])
        elements.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2" fill="${color}" stroke="${strokeColor}" stroke-width="0.5" />`)
      } else if (type === 'LineString' && Array.isArray(c)) {
        const pts = c.map(pt => `${scaleX(pt[0]).toFixed(1)},${scaleY(pt[1]).toFixed(1)}`).join(' ')
        elements.push(`<polyline points="${pts}" fill="none" stroke="${strokeColor}" stroke-width="1.2" />`)
      } else if (type === 'Polygon' && Array.isArray(c) && Array.isArray(c[0])) {
        const pts = c[0].map(pt => `${scaleX(pt[0]).toFixed(1)},${scaleY(pt[1]).toFixed(1)}`).join(' ')
        if (pts) {
          elements.push(`<polygon points="${pts}" fill="${color}" fill-opacity="0.4" stroke="${strokeColor}" stroke-width="0.6" />`)
        }
      }
    })
  }

  if (project.routingNodes && Array.isArray(project.routingNodes)) {
    project.routingNodes.forEach((n) => {
      if (typeof n.lng === 'number' && typeof n.lat === 'number') {
        const cx = scaleX(n.lng)
        const cy = scaleY(n.lat)
        elements.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="1" fill="#B8F7E4" />`)
      }
    })
  }

  return `<svg viewBox="0 0 100 60" style="width: 100%; height: 100%; display: block; background: #131416; border-radius: 4px;">${elements.join('')}</svg>`
}

export async function saveProject(project) {
  const db = await getDb()
  const now = new Date().toISOString()
  const thumbnail = generateThumbnailSVG(project)
  const record = {
    ...project,
    thumbnail,
    updatedAt: now,
    createdAt: project.createdAt || now,
  }
  await db.put(STORE_NAME, record)
  return record
}

export async function deleteProject(id) {
  const db = await getDb()
  return db.delete(STORE_NAME, id)
}

export async function renameProject(id, name, description) {
  const db = await getDb()
  const project = await db.get(STORE_NAME, id)
  if (!project) return null
  const updated = { ...project, name, description, updatedAt: new Date().toISOString() }
  await db.put(STORE_NAME, updated)
  return updated
}
