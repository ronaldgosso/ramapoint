import { openDB } from 'idb'

const OLD_DB_NAME = 'campass-map-creator'
const DB_NAME = 'ramapoint'
const DB_VERSION = 1
const STORE_NAME = 'projects'

let dbPromise = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('updatedAt', 'updatedAt')
          store.createIndex('name', 'name')
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

export async function saveProject(project) {
  const db = await getDb()
  const now = new Date().toISOString()
  const record = {
    ...project,
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

export async function renameProject(id, name) {
  const db = await getDb()
  const project = await db.get(STORE_NAME, id)
  if (!project) return null
  const updated = { ...project, name, updatedAt: new Date().toISOString() }
  await db.put(STORE_NAME, updated)
  return updated
}
