import { useApp } from '../../context/AppContext.jsx'
import { useUndoRedo } from '../../hooks/useUndoRedo.js'


export default function Toolbar() {
  const { state, dispatch, pushSnapshot, saveCurrentProject, ACTIONS } = useApp()
  const { canUndo, canRedo, undo, redo } = useUndoRedo(state, dispatch)
  const { project, drawingMode } = state

  const handleDrawMode = (mode) => {
    dispatch({ type: ACTIONS.SET_DRAWING_MODE, mode: drawingMode === mode ? null : mode })
  }

  const handleSave = async () => {
    dispatch({ type: ACTIONS.SET_SAVE_STATE, saveState: 'saving' })
    try {
      await saveCurrentProject()
      dispatch({ type: ACTIONS.SET_SAVE_STATE, saveState: 'saved' })
      dispatch({ type: ACTIONS.SHOW_TOAST, message: 'Project saved successfully!', toastType: 'success' })
    } catch (e) {
      console.error('Save failed', e)
      dispatch({ type: ACTIONS.SET_SAVE_STATE, saveState: 'error' })
      dispatch({ type: ACTIONS.SHOW_TOAST, message: 'Save failed: ' + e.message, toastType: 'error' })
    }
  }

  const featureCount = project.features.length
  const nodeCount = project.routingNodes.length

  return (
    <div className="toolbar" id="main-toolbar">
      {/* Mobile menu / sidebar toggle */}
      <button
        id="mobile-sidebar-toggle"
        className="btn btn-icon btn-ghost mobile-only"
        onClick={() => dispatch({ type: ACTIONS.TOGGLE_SIDEBAR })}
        style={{ marginRight: 'var(--sp-2)' }}
        title="Toggle Layers"
      >
        ☰
      </button>

      {/* Brand */}
      <div className="toolbar__brand">
        <img 
          src="/logo.png" 
          className="toolbar__logo animate-mint-glow" 
          alt="RamaPoint Logo" 
          style={{ width: '28px', height: '28px', objectFit: 'contain' }}
        />
        <span className="toolbar__title">
          Rama<span>Point</span>
        </span>
      </div>

      <div className="toolbar__divider" />

      {/* Project name and save status badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexShrink: 0 }}>
        <input
          id="project-name-input"
          type="text"
          value={project.name}
          onChange={(e) =>
            dispatch({ type: ACTIONS.SET_PROJECT_NAME, name: e.target.value })
          }
          onBlur={pushSnapshot}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-ui)',
            fontSize: '14px',
            fontWeight: 600,
            width: '150px',
            outline: 'none',
            cursor: 'text',
          }}
        />
        {state.saveState === 'unsaved' && (
          <span className="badge badge--yellow" style={{ padding: '2px 6px', fontSize: '9px', textTransform: 'uppercase' }} title="Unsaved changes">
            Unsaved •
          </span>
        )}
        {state.saveState === 'saving' && (
          <span className="badge badge--mint" style={{ padding: '2px 6px', fontSize: '9px', textTransform: 'uppercase' }} title="Saving to IndexedDB">
            Saving...
          </span>
        )}
        {state.saveState === 'saved' && (
          <span className="badge badge--gray" style={{ padding: '2px 6px', fontSize: '9px', textTransform: 'uppercase' }} title="All changes saved">
            Saved
          </span>
        )}
        {state.saveState === 'error' && (
          <span className="badge badge--red" style={{ padding: '2px 6px', fontSize: '9px', textTransform: 'uppercase' }} title="Save error! Quota exceeded?">
            Save Error ⚠️
          </span>
        )}
      </div>

      <div className="toolbar__divider" />

      {/* Draw mode buttons */}
      <div className="toolbar__group">
        <button
          id="draw-building-btn"
          className={`btn btn-icon btn-ghost${drawingMode === 'building' ? ' active' : ''}`}
          onClick={() => handleDrawMode('building')}
          data-tooltip="Draw Building"
        >
          🏛️
        </button>
        <button
          id="draw-path-btn"
          className={`btn btn-icon btn-ghost${drawingMode === 'path' ? ' active' : ''}`}
          onClick={() => handleDrawMode('path')}
          data-tooltip="Draw Path"
        >
          🛣️
        </button>
        <button
          id="draw-poi-btn"
          className={`btn btn-icon btn-ghost${drawingMode === 'poi' ? ' active' : ''}`}
          onClick={() => handleDrawMode('poi')}
          data-tooltip="Place POI"
        >
          📍
        </button>
      </div>

      <div className="toolbar__divider" />

      {/* Routing tools */}
      <div className="toolbar__group">
        <button
          id="draw-node-btn"
          className={`btn btn-icon btn-ghost${drawingMode === 'node' ? ' active' : ''}`}
          onClick={() => handleDrawMode('node')}
          data-tooltip="Add Routing Node"
        >
          🔵
        </button>
        <button
          id="draw-edge-btn"
          className={`btn btn-icon btn-ghost${drawingMode === 'edge' ? ' active' : ''}`}
          onClick={() => handleDrawMode('edge')}
          data-tooltip="Add Routing Edge"
        >
          ↗️
        </button>
      </div>

      <div className="toolbar__divider" />

      {/* Undo / Redo */}
      <div className="toolbar__group">
        <button
          id="undo-btn"
          className="btn btn-icon btn-ghost"
          onClick={undo}
          disabled={!canUndo}
          data-tooltip="Undo"
          style={{ opacity: canUndo ? 1 : 0.35 }}
        >
          ↩️
        </button>
        <button
          id="redo-btn"
          className="btn btn-icon btn-ghost"
          onClick={redo}
          disabled={!canRedo}
          data-tooltip="Redo"
          style={{ opacity: canRedo ? 1 : 0.35 }}
        >
          ↪️
        </button>
      </div>

      <div className="toolbar__spacer" />

      {/* Stats */}
      <span className="text-muted text-xs" style={{ marginRight: 'var(--sp-3)' }}>
        {featureCount} features · {nodeCount} nodes
      </span>

      {/* Action buttons */}
      <button
        id="project-manager-btn"
        className="btn btn-ghost"
        onClick={() => dispatch({ type: ACTIONS.OPEN_MODAL, modal: 'project_manager' })}
      >
        📁 Projects
      </button>

      <button
        id="save-btn"
        className="btn btn-ghost"
        onClick={handleSave}
        disabled={state.saveState === 'saving'}
      >
        {state.saveState === 'saving' ? (
          <><span className="animate-spin" style={{ display: 'inline-block', marginRight: '4px' }}>⟳</span> Saving…</>
        ) : (
          '💾 Save'
        )}
      </button>

      <button
        id="export-btn"
        className="btn btn-primary"
        onClick={() => dispatch({ type: ACTIONS.OPEN_MODAL, modal: 'export' })}
      >
        ⬇️ Export
      </button>
    </div>
  )
}
