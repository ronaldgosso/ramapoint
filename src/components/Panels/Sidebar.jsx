import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'

const TYPE_COLORS = {
  building: '#B8F7E4',
  path:     '#FBBF24',
  poi:      '#F87171',
  unknown:  '#9CA3AF',
}

export default function Sidebar() {
  const { state, dispatch, ACTIONS } = useApp()
  const [search, setSearch] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  
  // Collapsible sections
  const [nodesCollapsed, setNodesCollapsed] = useState(false)
  const [edgesCollapsed, setEdgesCollapsed] = useState(false)

  const { project, selectedFeatureId } = state

  const getMap = () => {
    const mapEl = document.getElementById('map-area')
    const container = mapEl?.querySelector('.leaflet-container')
    return container?._leaflet_map
  }

  const getLayer = (id, type) => {
    const mapEl = document.getElementById('map-area')
    const container = mapEl?.querySelector('.leaflet-container')
    if (!container) return null
    if (type === 'node') return container._node_layers?.get(id)
    if (type === 'edge') return container._edge_layers?.get(id)
    return container._rendered_layers?.get(id)
  }

  const handleSelect = (id, type) => {
    dispatch({ type: ACTIONS.SELECT_FEATURE, id })
    
    // Zoom/pan to layer viewport
    setTimeout(() => {
      const map = getMap()
      const layer = getLayer(id, type)
      if (map && layer) {
        if (layer.getBounds) {
          map.fitBounds(layer.getBounds(), { maxZoom: 18, padding: [20, 20] })
        } else if (layer.getLatLng) {
          map.setView(layer.getLatLng(), 18)
        }
      }
    }, 50)
  }

  const filteredFeatures = project.features.filter((f) =>
    !search || f.name?.toLowerCase().includes(search.toLowerCase()) ||
    f.type?.toLowerCase().includes(search.toLowerCase())
  )

  const buildings = filteredFeatures.filter((f) => f.type === 'building')
  const paths     = filteredFeatures.filter((f) => f.type === 'path')
  const pois      = filteredFeatures.filter((f) => f.type === 'poi')
  const others    = filteredFeatures.filter((f) => !['building', 'path', 'poi'].includes(f.type))

  const renderGroup = (label, items) => {
    if (items.length === 0) return null
    
    const allHidden = items.every(f => f.hidden)
    const toggleAllVisibility = (e) => {
      e.stopPropagation()
      items.forEach(f => {
        dispatch({ type: ACTIONS.UPDATE_FEATURE, id: f.id, updates: { hidden: !allHidden } })
      })
    }

    return (
      <div key={label} style={{ marginBottom: 'var(--sp-4)' }}>
        <div className="layer-section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{label}</span>
          <button
            className="btn btn-icon btn-ghost"
            style={{ width: '18px', height: '18px', fontSize: '10px', opacity: allHidden ? 0.3 : 0.7 }}
            onClick={toggleAllVisibility}
            title={allHidden ? "Show all in category" : "Hide all in category"}
          >
            👁️
          </button>
        </div>
        {items.map((feature) => (
          <div
            key={feature.id}
            id={`layer-item-${feature.id}`}
            className={`layer-item${selectedFeatureId === feature.id ? ' selected' : ''}`}
            onClick={() => handleSelect(feature.id, feature.type)}
          >
            <div
              className="layer-item__swatch"
              style={{ background: feature.color || TYPE_COLORS[feature.type] || '#9CA3AF' }}
            />
            <span className="layer-item__name" style={feature.hidden ? { opacity: 0.4, textDecoration: 'line-through' } : {}} title={feature.name}>
              {feature.icon ? `${feature.icon} ` : ''}
              {feature.name || 'Untitled'}
            </span>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <button
                className="btn btn-icon btn-ghost"
                style={{ width: '20px', height: '20px', fontSize: '11px', opacity: feature.hidden ? 0.3 : 0.7 }}
                onClick={(e) => {
                  e.stopPropagation()
                  dispatch({ type: ACTIONS.UPDATE_FEATURE, id: feature.id, updates: { hidden: !feature.hidden } })
                }}
                title={feature.hidden ? "Show layer" : "Hide layer"}
              >
                👁️
              </button>
              <button
                className="btn btn-icon btn-ghost"
                style={{
                  width: 'auto',
                  height: '20px',
                  fontSize: '10px',
                  opacity: confirmDeleteId === feature.id ? 1 : 0.5,
                  color: confirmDeleteId === feature.id ? '#EF4444' : 'inherit',
                  padding: confirmDeleteId === feature.id ? '0 6px' : '0',
                  border: confirmDeleteId === feature.id ? '1px solid #EF4444' : 'none',
                  borderRadius: '4px',
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirmDeleteId === feature.id) {
                    dispatch({ type: ACTIONS.REMOVE_FEATURE, id: feature.id })
                    setConfirmDeleteId(null)
                  } else {
                    setConfirmDeleteId(feature.id)
                  }
                }}
                title={confirmDeleteId === feature.id ? "Confirm Delete?" : "Delete"}
              >
                {confirmDeleteId === feature.id ? 'Confirm?' : '✕'}
              </button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Routing section
  const hasRouting = project.routingNodes.length > 0 || project.routingEdges.length > 0

  const routingSection = hasRouting ? (
    <div style={{ marginTop: 'var(--sp-4)' }}>
      <div className="layer-section-label" style={{ fontSize: '13px', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: 'var(--sp-2)' }}>
        Routing Graph
      </div>

      {/* Nodes sub-section */}
      <div>
        <div
          className="layer-section-label"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', paddingLeft: 'var(--sp-1)' }}
          onClick={() => setNodesCollapsed(!nodesCollapsed)}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <span>🔵 Nodes ({project.routingNodes.length})</span>
            <button
              className="btn btn-icon btn-ghost"
              style={{ width: '18px', height: '18px', fontSize: '10px', opacity: project.routingNodes.every(n => n.hidden) ? 0.3 : 0.7 }}
              onClick={(e) => {
                e.stopPropagation()
                const allHidden = project.routingNodes.every(n => n.hidden)
                project.routingNodes.forEach((n) => {
                  dispatch({ type: ACTIONS.UPDATE_ROUTING_NODE, id: n.id, updates: { hidden: !allHidden } })
                })
              }}
              title={project.routingNodes.every(n => n.hidden) ? "Show all nodes" : "Hide all nodes"}
            >
              👁️
            </button>
          </span>
          <span>{nodesCollapsed ? '▶' : '▼'}</span>
        </div>
        {!nodesCollapsed && project.routingNodes.map((node) => (
          <div
            key={node.id}
            className={`layer-item${state.selectedNodeId === node.id ? ' selected' : ''}`}
            onClick={() => handleSelect(node.id, 'node')}
            style={{ paddingLeft: 'var(--sp-4)' }}
          >
            <div className="layer-item__swatch" style={{ background: node.color || '#B8F7E4', borderRadius: '50%' }} />
            <span className="layer-item__name" style={node.hidden ? { opacity: 0.4, textDecoration: 'line-through' } : {}}>
              {node.label || `Node (${node.lat.toFixed(4)}, ${node.lng.toFixed(4)})`}
            </span>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <button
                className="btn btn-icon btn-ghost"
                style={{ width: '20px', height: '20px', fontSize: '11px', opacity: node.hidden ? 0.3 : 0.7 }}
                onClick={(e) => {
                  e.stopPropagation()
                  dispatch({ type: ACTIONS.UPDATE_ROUTING_NODE, id: node.id, updates: { hidden: !node.hidden } })
                }}
                title={node.hidden ? "Show node" : "Hide node"}
              >
                👁️
              </button>
              <button
                className="btn btn-icon btn-ghost"
                style={{
                  width: 'auto',
                  height: '20px',
                  fontSize: '10px',
                  opacity: confirmDeleteId === node.id ? 1 : 0.5,
                  color: confirmDeleteId === node.id ? '#EF4444' : 'inherit',
                  padding: confirmDeleteId === node.id ? '0 6px' : '0',
                  border: confirmDeleteId === node.id ? '1px solid #EF4444' : 'none',
                  borderRadius: '4px',
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirmDeleteId === node.id) {
                    dispatch({ type: ACTIONS.REMOVE_ROUTING_NODE, id: node.id })
                    setConfirmDeleteId(null)
                  } else {
                    setConfirmDeleteId(node.id)
                  }
                }}
                title={confirmDeleteId === node.id ? "Confirm Delete?" : "Delete Node"}
              >
                {confirmDeleteId === node.id ? 'Confirm?' : '✕'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edges sub-section */}
      <div style={{ marginTop: 'var(--sp-3)' }}>
        <div
          className="layer-section-label"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', paddingLeft: 'var(--sp-1)' }}
          onClick={() => setEdgesCollapsed(!edgesCollapsed)}
        >
          <span>↗️ Edges ({project.routingEdges.length})</span>
          <span>{edgesCollapsed ? '▶' : '▼'}</span>
        </div>
        {!edgesCollapsed && project.routingEdges.map((edge) => {
          const fromNode = project.routingNodes.find(n => n.id === edge.from)
          const toNode = project.routingNodes.find(n => n.id === edge.to)
          const label = `${fromNode?.label || 'Node'} ➔ ${toNode?.label || 'Node'}`
          return (
            <div
              key={edge.id}
              className={`layer-item${state.selectedEdgeId === edge.id ? ' selected' : ''}`}
              onClick={() => handleSelect(edge.id, 'edge')}
              style={{ paddingLeft: 'var(--sp-4)' }}
            >
              <div className="layer-item__swatch" style={{ background: edge.color || '#B8F7E4', height: '4px', borderRadius: '2px' }} />
              <span className="layer-item__name" style={{ fontSize: '11px' }}>{label}</span>
              <button
                className="btn btn-icon btn-ghost"
                style={{
                  width: 'auto',
                  height: '20px',
                  fontSize: '10px',
                  opacity: confirmDeleteId === edge.id ? 1 : 0.5,
                  color: confirmDeleteId === edge.id ? '#EF4444' : 'inherit',
                  padding: confirmDeleteId === edge.id ? '0 6px' : '0',
                  border: confirmDeleteId === edge.id ? '1px solid #EF4444' : 'none',
                  borderRadius: '4px',
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirmDeleteId === edge.id) {
                    dispatch({ type: ACTIONS.REMOVE_ROUTING_EDGE, id: edge.id })
                    setConfirmDeleteId(null)
                  } else {
                    setConfirmDeleteId(edge.id)
                  }
                }}
                title={confirmDeleteId === edge.id ? "Confirm Delete?" : "Delete Edge"}
              >
                {confirmDeleteId === edge.id ? 'Confirm?' : '✕'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  ) : null

  return (
    <div className={`sidebar${state.sidebarOpen ? ' open' : ''}`} id="sidebar">
      <div className="sidebar__header">
        <div className="sidebar__title">Layers</div>
        <div className="sidebar__search">
          <span className="search-icon">🔍</span>
          <input
            id="layer-search"
            type="text"
            placeholder="Search layers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="sidebar__body">
        {filteredFeatures.length === 0 && !hasRouting ? (
          <div className="empty-state">
            <span className="empty-state__icon">🗺️</span>
            <p className="empty-state__text">
              No features yet. Use the drawing tools above to add buildings, paths, and POIs.
            </p>
          </div>
        ) : (
          <>
            {renderGroup('Buildings', buildings)}
            {renderGroup('Paths', paths)}
            {renderGroup('Points of Interest', pois)}
            {renderGroup('Other', others)}
            {routingSection}
          </>
        )}
      </div>
    </div>
  )
}
