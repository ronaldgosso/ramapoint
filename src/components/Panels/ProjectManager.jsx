import { useState, useEffect, useCallback } from 'react'
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
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
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
    dispatch({ type: ACTIONS.NEW_PROJECT, name: newName.trim() })
    setNewName('')
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

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this project?')) return
    await deleteProject(id)
    await refresh()
  }

  const handleRenameSubmit = async (id) => {
    if (!editName.trim()) return
    await renameProject(id, editName.trim())
    setEditingId(null)
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
            <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
              <input
                id="new-project-name"
                className="field__input"
                style={{ flex: 1 }}
                placeholder="Campus name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNew()}
              />
              <button
                className="btn btn-primary"
                onClick={handleNew}
                disabled={!newName.trim()}
                id="create-project-btn"
              >
                Create
              </button>
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
                  <div className="project-card__preview">🗺️</div>

                  {editingId === project.id ? (
                    <input
                      className="field__input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => handleRenameSubmit(project.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit(project.id)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      style={{ marginBottom: 'var(--sp-1)' }}
                    />
                  ) : (
                    <div className="project-card__name">{project.name}</div>
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
