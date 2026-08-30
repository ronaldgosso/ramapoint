import { useApp } from '../../context/AppContext.jsx'

export default function Toolbar() {
  const { state, dispatch, pushSnapshot, saveCurrentProject, ACTIONS, canUndo, canRedo, undo, redo } = useApp()
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
        aria-label="Toggle layers panel"
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
      <div className="toolbar__group" role="group" aria-label="Draw tools">
        <button
          id="draw-building-btn"
          className={`btn btn-icon btn-ghost${drawingMode === 'building' ? ' active' : ''}`}
          onClick={() => handleDrawMode('building')}
          data-tooltip="Draw Building (B)"
          aria-label="Draw building"
          aria-pressed={drawingMode === 'building'}
        >
          🏛️
        </button>
        <button
          id="draw-path-btn"
          className={`btn btn-icon btn-ghost${drawingMode === 'path' ? ' active' : ''}`}
          onClick={() => handleDrawMode('path')}
          data-tooltip="Draw Path (P)"
          aria-label="Draw path"
          aria-pressed={drawingMode === 'path'}
        >
          🛣️
        </button>
        <button
          id="draw-poi-btn"
          className={`btn btn-icon btn-ghost${drawingMode === 'poi' ? ' active' : ''}`}
          onClick={() => handleDrawMode('poi')}
          data-tooltip="Place POI (M)"
          aria-label="Place point of interest"
          aria-pressed={drawingMode === 'poi'}
        >
          📍
        </button>
      </div>

      <div className="toolbar__divider" />

      {/* Routing tools */}
      <div className="toolbar__group" role="group" aria-label="Routing tools">
        <button
          id="draw-node-btn"
          className={`btn btn-icon btn-ghost${drawingMode === 'node' ? ' active' : ''}`}
          onClick={() => handleDrawMode('node')}
          data-tooltip="Add Routing Node"
          aria-label="Add routing node"
          aria-pressed={drawingMode === 'node'}
        >
          🔵
        </button>
        <button
          id="draw-edge-btn"
          className={`btn btn-icon btn-ghost${drawingMode === 'edge' ? ' active' : ''}`}
          onClick={() => handleDrawMode('edge')}
          data-tooltip="Add Routing Edge"
          aria-label="Add routing edge"
          aria-pressed={drawingMode === 'edge'}
        >
          ↗️
        </button>
        <button
          id="find-route-btn"
          className={`btn btn-icon btn-ghost${drawingMode === 'route' ? ' active' : ''}`}
          onClick={() => {
            handleDrawMode('route')
            dispatch({ type: ACTIONS.CLEAR_ROUTE })
          }}
          data-tooltip="Find Shortest Route"
          aria-label="Find shortest route between two nodes"
          aria-pressed={drawingMode === 'route'}
        >
          🗺️
        </button>
        {state.routeResult && (
          <button
            id="clear-route-btn"
            className="btn btn-icon btn-ghost"
            onClick={() => dispatch({ type: ACTIONS.CLEAR_ROUTE })}
            data-tooltip="Clear Route"
            aria-label="Clear current route"
          >
            ✕
          </button>
        )}
      </div>

      <div className="toolbar__divider" />

      {/* Undo / Redo */}
      <div className="toolbar__group" role="group" aria-label="History">
        <button
          id="undo-btn"
          className="btn btn-icon btn-ghost"
          onClick={undo}
          disabled={!canUndo}
          data-tooltip="Undo (Ctrl+Z)"
          aria-label="Undo"
          style={{ opacity: canUndo ? 1 : 0.35 }}
        >
          ↩️
        </button>
        <button
          id="redo-btn"
          className="btn btn-icon btn-ghost"
          onClick={redo}
          disabled={!canRedo}
          data-tooltip="Redo (Ctrl+Y)"
          aria-label="Redo"
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
