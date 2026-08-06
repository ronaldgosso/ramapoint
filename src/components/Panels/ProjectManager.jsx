import { useState, useEffect, useCallback } from 'react'
import JSZip from 'jszip'
import { v4 as uuidv4 } from '../../lib/uuid.js'
import { useApp } from '../../context/AppContext.jsx'
import {
  getAllProjects,
  saveProject,
  deleteProject,
  renameProject,
} from '../../hooks/useProjectStore.js'

export default function ProjectManager() {
  const { state, dispatch, ACTIONS } = useApp()
  const [projects, setProjects] = useState([])
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    const all = await getAllProjects()
    setProjects(all.reverse())
    dispatch({ type: ACTIONS.SET_PROJECTS, projects: all.reverse() })
  }, [dispatch, ACTIONS.SET_PROJECTS])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  const handleNew = () => {
    if (!newName.trim()) return
    dispatch({ type: ACTIONS.NEW_PROJECT, name: newName.trim(), description: newDescription.trim() })
    setNewName('')
    setNewDescription('')
    dispatch({ type: ACTIONS.CLOSE_MODAL })
  }

  const handleLoad = async (project) => {
    dispatch({ type: ACTIONS.SET_PROJECT, project })
    dispatch({ type: ACTIONS.CLOSE_MODAL })
  }

  const handleSaveCurrent = async () => {
    setLoading(true)
    try {
      const project = { ...state.project, updatedAt: new Date().toISOString() }
      await saveProject(project)
      await refresh()
    } finally {
      setLoading(false)
    }
  }

  const handleImportFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setLoading(true)
    try {
      const ext = file.name.split('.').pop().toLowerCase()
      let importedProject = null

      if (ext === 'zip') {
        const zip = new JSZip()
        const zipData = await zip.loadAsync(file)

        const geojsonFile = zipData.file('campus.geojson')
        const routingFile = zipData.file('routing_graph.json')

        if (!geojsonFile) {
          dispatch({
            type: ACTIONS.SHOW_TOAST,
            message: 'Error: Incompatible ZIP package. "campus.geojson" is missing.',
            toastType: 'error'
          })
          return
        }

        const geojsonText = await geojsonFile.async('text')
        const geojson = JSON.parse(geojsonText)

        let routingGraph = null
        if (routingFile) {
          const routingText = await routingFile.async('text')
          routingGraph = JSON.parse(routingText)
        }

        importedProject = parseImportedData(file.name.replace('.zip', ''), geojson, routingGraph)
      } else if (ext === 'json' || ext === 'geojson') {
        const text = await file.text()
        const json = JSON.parse(text)

        if (json.type === 'FeatureCollection' && Array.isArray(json.features)) {
          // It's a GeoJSON FeatureCollection
          importedProject = parseImportedData(file.name.replace(/\.[^/.]+$/, ""), json, null)
        } else if (json.type === 'RoutingGraph' && Array.isArray(json.nodes)) {
          // It's a Routing Graph JSON
          importedProject = parseImportedData(file.name.replace(/\.[^/.]+$/, ""), null, json)
        } else if (Array.isArray(json.features) && Array.isArray(json.routingNodes) && Array.isArray(json.routingEdges)) {
          // It's a project backup JSON
          importedProject = {
            id: json.id || uuidv4(),
            name: json.name || file.name.replace(/\.[^/.]+$/, ""),
            center: Array.isArray(json.center) ? json.center : [40.7128, -74.006],
            zoom: typeof json.zoom === 'number' ? json.zoom : 16,
            features: json.features,
            routingNodes: json.routingNodes,
            routingEdges: json.routingEdges,
            createdAt: json.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        } else {
          dispatch({
            type: ACTIONS.SHOW_TOAST,
            message: 'Error: Incompatible JSON structure. The file format is not recognized.',
            toastType: 'error'
          })
          return
        }
      } else {
        dispatch({
          type: ACTIONS.SHOW_TOAST,
          message: 'Error: Unsupported file type. Please upload a .zip, .geojson, or .json file.',
          toastType: 'error'
        })
        return
      }

      if (importedProject) {
        await saveProject(importedProject)
        await refresh()
        dispatch({ type: ACTIONS.SET_PROJECT, project: importedProject })
        dispatch({ type: ACTIONS.CLOSE_MODAL })
        dispatch({
          type: ACTIONS.SHOW_TOAST,
          message: `Successfully imported "${importedProject.name}"!`,
          toastType: 'success'
        })
      }
    } catch (err) {
      console.error('Import failed:', err)
      dispatch({
        type: ACTIONS.SHOW_TOAST,
        message: 'Error: Failed to parse and import file. Ensure it is not corrupted. Detail: ' + err.message,
        toastType: 'error'
      })
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this project?')) return
    await deleteProject(id)
    await refresh()
  }

  const handleRenameSubmit = async (id) => {
    if (!editName.trim()) return
    await renameProject(id, editName.trim(), editDescription.trim())
    setEditingId(null)
    setEditDescription('')
    await refresh()
  }

  const formatDate = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="modal-overlay" onClick={() => dispatch({ type: ACTIONS.CLOSE_MODAL })}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__title">
            <div className="modal__title-icon">📁</div>
            Project Manager
          </div>
          <button
            className="btn btn-icon btn-ghost"
            onClick={() => dispatch({ type: ACTIONS.CLOSE_MODAL })}
            id="close-project-manager"
          >
            ✕
          </button>
        </div>

        <div className="modal__body">
          {/* Create new project */}
          <div style={{ marginBottom: 'var(--sp-6)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: 'var(--sp-3)', color: 'var(--text-secondary)' }}>
              NEW PROJECT
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              <input
                id="new-project-name"
                className="field__input"
                placeholder="Campus name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNew()}
              />
              <textarea
                id="new-project-description"
                className="field__input"
                placeholder="Project description / notes (optional)..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                style={{ resize: 'vertical', minHeight: '60px', fontFamily: 'inherit' }}
              />
              <button
                className="btn btn-primary"
                onClick={handleNew}
                disabled={!newName.trim()}
                id="create-project-btn"
                style={{ alignSelf: 'flex-end' }}
              >
                Create
              </button>
            </div>
          </div>

          {/* Import project */}
          <div style={{ marginBottom: 'var(--sp-6)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: 'var(--sp-3)', color: 'var(--text-secondary)' }}>
              IMPORT PROJECT
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
              <label
                className="btn btn-ghost"
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--graphite-700)', border: '1px dashed var(--border)' }}
              >
                📁 Choose File
                <input
                  type="file"
                  accept=".zip,.geojson,.json"
                  style={{ display: 'none' }}
                  onChange={handleImportFile}
                />
              </label>
              <span className="text-muted text-sm" style={{ fontSize: '12px' }}>
                Supports exported ZIP packages, GeoJSON files, or project backups.
              </span>
            </div>
          </div>

          <div className="separator" />

          {/* Saved projects */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              SAVED PROJECTS ({projects.length})
            </h3>
            <button
              className="btn btn-ghost"
              style={{ fontSize: '12px' }}
              onClick={handleSaveCurrent}
              disabled={loading}
            >
              {loading ? '...' : '💾 Save Current'}
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state__icon">💾</span>
              <p className="empty-state__text">No saved projects yet</p>
            </div>
          ) : (
            <div className="project-grid">
              {projects.map((project) => (
                <div
                  key={project.id}
                  id={`project-card-${project.id}`}
                  className={`project-card${state.project.id === project.id ? ' selected' : ''}`}
                  onClick={() => handleLoad(project)}
                  style={state.project.id === project.id ? { borderColor: 'var(--border-lit)' } : {}}
                >
                  {project.thumbnail ? (
                    <div
                      className="project-card__preview"
                      style={{ padding: 0, overflow: 'hidden' }}
                      dangerouslySetInnerHTML={{ __html: project.thumbnail }}
                    />
                  ) : (
                    <div className="project-card__preview">🗺️</div>
                  )}

                  {editingId === project.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', marginBottom: 'var(--sp-2)' }} onClick={(e) => e.stopPropagation()}>
                      <input
                        className="field__input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Project name"
                        style={{ marginBottom: 'var(--sp-1)' }}
                      />
                      <textarea
                        className="field__input"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Description (optional)"
                        style={{ minHeight: '50px', fontSize: '12px' }}
                      />
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '2px 8px', height: '24px' }} onClick={() => setEditingId(null)}>Cancel</button>
                        <button className="btn btn-primary" style={{ fontSize: '11px', padding: '2px 8px', height: '24px' }} onClick={() => handleRenameSubmit(project.id)}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="project-card__name">{project.name}</div>
                      {project.description && (
                        <div className="project-card__description" style={{ fontSize: '12px', opacity: 0.7, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {project.description}
                        </div>
                      )}
                    </>
                  )}

                  <div className="project-card__meta">
                    {project.features?.length || 0} features · Updated {formatDate(project.updatedAt)}
                  </div>

                  <div className="project-card__actions">
                    <button
                      className="btn btn-icon btn-ghost"
                      style={{ width: '22px', height: '22px', fontSize: '11px' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingId(project.id)
                        setEditName(project.name)
                        setEditDescription(project.description || '')
                      }}
                      title="Rename"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn btn-icon btn-ghost"
                      style={{ width: '22px', height: '22px', fontSize: '11px' }}
                      onClick={(e) => handleDelete(e, project.id)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal__footer">
          <button
            className="btn btn-ghost"
            onClick={() => dispatch({ type: ACTIONS.CLOSE_MODAL })}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function parseImportedData(projectName, geojson, routingGraph) {
  const features = []
  const routingNodes = []
  const routingEdges = []

  // 1. Parse GeoJSON Features
  if (geojson && Array.isArray(geojson.features)) {
    geojson.features.forEach((f) => {
      const props = f.properties || {}
      const id = f.id || props.id || uuidv4()
      const geometryType = f.geometry?.type
      if (!geometryType) return

      // Map geometry type to feature type
      const type = props.type || (
        geometryType.includes('Polygon') ? 'building' :
        geometryType.includes('Line') ? 'path' : 'poi'
      )

      // Filter custom metadata keys (non-standard attributes)
      const standardKeys = ['id', 'name', 'type', 'color', 'strokeColor', 'strokeWeight', 'category', 'icon']
      const metadata = {}
      Object.keys(props).forEach((k) => {
        if (!standardKeys.includes(k)) {
          metadata[k] = props[k]
        }
      })

      features.push({
        id,
        name: props.name || `${type.charAt(0).toUpperCase() + type.slice(1)} ${Date.now()}`,
        type,
        color: props.color || (type === 'building' ? '#B8F7E4' : type === 'path' ? '#FBBF24' : '#F87171'),
        strokeColor: props.strokeColor || (type === 'building' ? '#7BE8C9' : type === 'path' ? '#FBBF24' : '#F87171'),
        strokeWeight: typeof props.strokeWeight === 'number' ? props.strokeWeight : 3,
        category: props.category || null,
        icon: props.icon || (type === 'poi' ? '📍' : null),
        metadata,
        geometry: f.geometry,
      })
    })
  }

  // 2. Parse Routing Graph Nodes & Edges
  if (routingGraph) {
    if (Array.isArray(routingGraph.nodes)) {
      routingGraph.nodes.forEach((n) => {
        if (typeof n.lat !== 'number' || typeof n.lng !== 'number') return
        routingNodes.push({
          id: n.id || uuidv4(),
          lat: n.lat,
          lng: n.lng,
          label: n.label || '',
          nodeType: n.type || 'waypoint',
        })
      })
    }

    if (Array.isArray(routingGraph.edges)) {
      routingGraph.edges.forEach((e) => {
        if (!e.from || !e.to) return
        routingEdges.push({
          id: e.id || uuidv4(),
          from: e.from,
          to: e.to,
          distance: typeof e.distance === 'number' ? e.distance : 0,
          walkTime: typeof e.walkTime === 'number' ? e.walkTime : 0,
          bidirectional: e.bidirectional !== false,
          color: e.color || '#B8F7E4',
          weight: typeof e.weight === 'number' ? e.weight : 2.5,
        })
      })
    }
  }

  // 3. Compute Map Center based on coordinates
  let center = [40.7128, -74.006]
  const lats = []
  const lngs = []

  features.forEach((f) => {
    const type = f.geometry?.type
    const coords = f.geometry?.coordinates
    if (!coords) return

    if (type === 'Point' && Array.isArray(coords)) {
      lats.push(coords[1])
      lngs.push(coords[0])
    } else if (type === 'LineString' && Array.isArray(coords)) {
      coords.forEach((c) => {
        lats.push(c[1])
        lngs.push(c[0])
      })
    } else if (type === 'Polygon' && Array.isArray(coords) && Array.isArray(coords[0])) {
      coords[0].forEach((c) => {
        lats.push(c[1])
        lngs.push(c[0])
      })
    }
  })

  routingNodes.forEach((n) => {
    lats.push(n.lat)
    lngs.push(n.lng)
  })

  if (lats.length > 0 && lngs.length > 0) {
    const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length
    const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length
    center = [avgLat, avgLng]
  }

  return {
    id: uuidv4(),
    name: projectName,
    center,
    zoom: 16,
    features,
    routingNodes,
    routingEdges,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}
