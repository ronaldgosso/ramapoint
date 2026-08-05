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

  const { project, selectedFeatureId } = state

  const filteredFeatures = project.features.filter((f) =>
    !search || f.name?.toLowerCase().includes(search.toLowerCase()) ||
    f.type?.toLowerCase().includes(search.toLowerCase())
  )

  const buildings = filteredFeatures.filter((f) => f.type === 'building')
  const paths     = filteredFeatures.filter((f) => f.type === 'path')
  const pois      = filteredFeatures.filter((f) => f.type === 'poi')
  const others    = filteredFeatures.filter((f) => !['building', 'path', 'poi'].includes(f.type))

  const handleSelect = (id) => {
    dispatch({ type: ACTIONS.SELECT_FEATURE, id })
  }

  const handleDelete = (e, id) => {
    e.stopPropagation()
    dispatch({ type: ACTIONS.REMOVE_FEATURE, id })
  }

  const renderGroup = (label, items) => {
    if (items.length === 0) return null
    return (
      <div key={label}>
        <div className="layer-section-label">{label}</div>
        {items.map((feature) => (
          <div
            key={feature.id}
            id={`layer-item-${feature.id}`}
            className={`layer-item${selectedFeatureId === feature.id ? ' selected' : ''}`}
            onClick={() => handleSelect(feature.id)}
          >
            <div
              className="layer-item__swatch"
              style={{ background: feature.color || TYPE_COLORS[feature.type] || '#9CA3AF' }}
            />
            <span className="layer-item__name" title={feature.name}>
              {feature.icon ? `${feature.icon} ` : ''}
              {feature.name || 'Untitled'}
            </span>
            <button
              className="btn btn-icon btn-ghost"
              style={{ width: '20px', height: '20px', fontSize: '11px', opacity: 0.5 }}
              onClick={(e) => handleDelete(e, feature.id)}
              title="Delete"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    )
  }

  const routingSection = project.routingNodes.length > 0 ? (
    <div>
      <div className="layer-section-label">Routing Graph</div>
      {project.routingNodes.map((node) => (
        <div
          key={node.id}
          className={`layer-item${state.selectedNodeId === node.id ? ' selected' : ''}`}
          onClick={() => dispatch({ type: ACTIONS.SELECT_FEATURE, id: node.id })}
        >
          <div className="layer-item__swatch" style={{ background: '#B8F7E4', borderRadius: '50%' }} />
          <span className="layer-item__name">{node.label || 'Node'}</span>
          <span className="layer-item__type">node</span>
        </div>
      ))}
    </div>
  ) : null

  return (
    <div className="sidebar" id="sidebar">
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
        {filteredFeatures.length === 0 && project.routingNodes.length === 0 ? (
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
