import { useApp } from '../../context/AppContext.jsx'
import { useTileCache } from '../../hooks/useTileCache.js'

export default function StatusBar() {
  const { state, dispatch, ACTIONS } = useApp()
  const { isCaching, cached, total, progress, cacheTiles, cancelCache } = useTileCache()

  // Try to get the leaflet map from DOM
  const handleCacheTiles = () => {
    // Access the leaflet map instance via the container
    const mapEl = document.getElementById('map-area')
    if (!mapEl) return
    const mapContainer = mapEl.querySelector('.leaflet-container')
    if (!mapContainer || !mapContainer._leaflet_map) {
      dispatch({ type: ACTIONS.SHOW_TOAST, message: 'Map not ready yet', toastType: 'warn' })
      return
    }
    cacheTiles(mapContainer._leaflet_map, 14, 18)
  }

  const featureCount = state.project.features.length
  const nodeCount = state.project.routingNodes.length
  const edgeCount = state.project.routingEdges.length

  return (
    <div className="statusbar" id="statusbar">
      {/* Profile & Copyright */}
      <div className="statusbar__item">
        <a 
          href="https://github.com/ronaldgosso" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <span>© {new Date().getFullYear()}</span>
          <strong>ronaldgosso</strong>
        </a>
      </div>

      <span style={{ color: 'var(--border)', userSelect: 'none' }}>|</span>

      {/* Project info */}
      <div className="statusbar__item">
        <span style={{ opacity: 0.5 }}>🗺️</span>
        {state.project.name}
      </div>

      <span style={{ color: 'var(--border)', userSelect: 'none' }}>|</span>

      {/* Feature counts */}
      <div className="statusbar__item">
        <span>Features: </span>
        <strong style={{ color: 'var(--mint)' }}>{featureCount}</strong>
      </div>

      <div className="statusbar__item">
        <span>Nodes: </span>
        <strong style={{ color: 'var(--mint)' }}>{nodeCount}</strong>
      </div>

      <div className="statusbar__item">
        <span>Edges: </span>
        <strong style={{ color: 'var(--mint)' }}>{edgeCount}</strong>
      </div>

      <div style={{ flex: 1 }} />

      {/* Tile caching */}
      {isCaching ? (
        <>
          <span className="statusbar__item">
            Caching tiles: {cached} / {total}
          </span>
          <div className="statusbar__progress">
            <div className="statusbar__progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <button
            className="btn btn-ghost"
            style={{ height: '20px', padding: '0 8px', fontSize: '11px' }}
            onClick={cancelCache}
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          id="cache-tiles-btn"
          className="btn btn-ghost"
          style={{ height: '20px', padding: '0 8px', fontSize: '11px' }}
          onClick={handleCacheTiles}
          title="Pre-cache tiles for offline use"
        >
          📥 Cache Tiles
        </button>
      )}

      <span style={{ color: 'var(--border)', userSelect: 'none' }}>|</span>
      <span className="text-xs text-muted">RamaPoint v1.0</span>
    </div>
  )
}
