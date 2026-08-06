import { useMemo } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import ColorPicker from '../UI/ColorPicker.jsx'
import { POI_ICONS } from '../../constants/poiIcons.js'

export default function PropertiesPanel() {
  const { state, dispatch, pushSnapshot, ACTIONS } = useApp()

  const selectedFeature = state.project.features.find(
    (f) => f.id === state.selectedFeatureId
  )

  const selectedNode = state.project.routingNodes.find(
    (n) => n.id === state.selectedNodeId
  )

  const selectedEdge = state.project.routingEdges.find(
    (e) => e.id === state.selectedEdgeId
  )

  const form = useMemo(() => {
    if (selectedFeature) {
      return {
        name: selectedFeature.name || '',
        color: selectedFeature.color || '#B8F7E4',
        strokeColor: selectedFeature.strokeColor || '#B8F7E4',
        strokeWeight: selectedFeature.strokeWeight || 3,
        category: selectedFeature.category || '',
        icon: selectedFeature.icon || '',
        metadata: selectedFeature.metadata || {},
      }
    }
    if (selectedNode) {
      return {
        label: selectedNode.label || '',
        nodeType: selectedNode.nodeType || 'waypoint',
      }
    }
    if (selectedEdge) {
      return {
        color: selectedEdge.color || '#B8F7E4',
        weight: selectedEdge.weight || 2.5,
      }
    }
    return {}
  }, [selectedFeature, selectedNode, selectedEdge])

  const updateFeature = (updates) => {
    if (!selectedFeature) return
    dispatch({ type: ACTIONS.UPDATE_FEATURE, id: selectedFeature.id, updates })
    pushSnapshot()
  }

  const updateNode = (updates) => {
    if (!selectedNode) return
    dispatch({ type: ACTIONS.UPDATE_ROUTING_NODE, id: selectedNode.id, updates })
  }

  const updateEdge = (updates) => {
    if (!selectedEdge) return
    dispatch({ type: ACTIONS.UPDATE_ROUTING_EDGE, id: selectedEdge.id, updates })
  }

  const handleFieldChange = (key, value) => {
    if (selectedFeature) {
      updateFeature({ [key]: value })
    }
  }

  const addMetaKey = () => {
    if (!selectedFeature) return
    const newMeta = { ...(selectedFeature.metadata || {}), '': '' }
    updateFeature({ metadata: newMeta })
  }

  const updateMetaKey = (oldKey, newKey, value) => {
    if (!selectedFeature) return
    const newMeta = {}
    Object.entries(selectedFeature.metadata || {}).forEach(([k, v]) => {
      if (k === oldKey) newMeta[newKey] = value
      else newMeta[k] = v
    })
    updateFeature({ metadata: newMeta })
  }

  const removeMetaKey = (key) => {
    if (!selectedFeature) return
    const newMeta = { ...(selectedFeature.metadata || {}) }
    delete newMeta[key]
    updateFeature({ metadata: newMeta })
  }

  if (!selectedFeature && !selectedNode && !selectedEdge) {
    return (
      <div className="properties-panel" id="properties-panel">
        <div className="panel-header">
          <span className="panel-header__title">Properties</span>
        </div>
        <div className="panel-body">
          <div className="empty-state">
            <span className="empty-state__icon">👆</span>
            <p className="empty-state__text">Select a feature to edit its properties</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Edge properties ────────────────────────────────────
  if (selectedEdge && !selectedFeature && !selectedNode) {
    const fromNode = state.project.routingNodes.find((n) => n.id === selectedEdge.from)
    const toNode = state.project.routingNodes.find((n) => n.id === selectedEdge.to)
    return (
      <div className="properties-panel" id="properties-panel">
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <span className="panel-header__title">Edge Properties</span>
            <span className="panel-header__type-badge badge badge--mint">Routing Edge</span>
          </div>
          <button
            className="btn btn-icon btn-ghost"
            onClick={() => dispatch({ type: ACTIONS.DESELECT })}
            style={{ width: '24px', height: '24px', padding: 0 }}
            title="Close Panel"
            type="button"
          >
            ✕
          </button>
        </div>
        <div className="panel-body">
          <div className="field">
            <label className="field__label">Connection</label>
            <p className="text-sm">
              {fromNode?.label || 'Node A'} ➔ {toNode?.label || 'Node B'}
            </p>
          </div>

          <ColorPicker
            label="Edge Color"
            value={form.color}
            onChange={(c) => updateEdge({ color: c })}
          />

          <div className="field">
            <label className="field__label">Line Width ({form.weight}px)</label>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              className="field__input"
              value={form.weight}
              onChange={(e) => updateEdge({ weight: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>

          <button
            className="btn btn-danger w-full mt-4"
            onClick={() => dispatch({ type: ACTIONS.REMOVE_ROUTING_EDGE, id: selectedEdge.id })}
            style={{ width: '100%', marginTop: 'var(--sp-4)' }}
          >
            🗑️ Delete Edge
          </button>
        </div>
      </div>
    )
  }

  // ── Node properties ────────────────────────────────────
  if (selectedNode && !selectedFeature) {
    const edgesFromNode = state.project.routingEdges.filter(
      (e) => e.from === selectedNode.id || e.to === selectedNode.id
    )
    return (
      <div className="properties-panel" id="properties-panel">
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <span className="panel-header__title">Node Properties</span>
            <span className="panel-header__type-badge badge badge--mint">Routing Node</span>
          </div>
          <button
            className="btn btn-icon btn-ghost"
            onClick={() => dispatch({ type: ACTIONS.DESELECT })}
            style={{ width: '24px', height: '24px', padding: 0 }}
            title="Close Panel"
            type="button"
          >
            ✕
          </button>
        </div>
        <div className="panel-body">
          <div className="field">
            <label className="field__label">Label</label>
            <input
              className="field__input"
              value={form.label || ''}
              onChange={(e) => updateNode({ label: e.target.value })}
              placeholder="Node label"
            />
          </div>
          <div className="field">
            <label className="field__label">Type</label>
            <select
              className="field__input"
              value={form.nodeType || 'waypoint'}
              onChange={(e) => updateNode({ nodeType: e.target.value })}
            >
              <option value="waypoint">Waypoint</option>
              <option value="entrance">Entrance</option>
              <option value="junction">Junction</option>
              <option value="destination">Destination</option>
            </select>
          </div>
          <div className="separator" />
          <div className="field">
            <label className="field__label">Connected Edges</label>
            <p className="text-muted text-sm">{edgesFromNode.length} edge(s)</p>
          </div>
          <div className="field">
            <label className="field__label">Coordinates</label>
            <p className="text-muted text-sm font-mono">
              {selectedNode.lat.toFixed(6)}, {selectedNode.lng.toFixed(6)}
            </p>
          </div>
          <button
            className="btn btn-danger w-full mt-4"
            onClick={() => dispatch({ type: ACTIONS.REMOVE_ROUTING_NODE, id: selectedNode.id })}
          >
            🗑️ Delete Node
          </button>
        </div>
      </div>
    )
  }

  // ── Feature properties ────────────────────────────────
  const type = selectedFeature.type

  return (
    <div className="properties-panel" id="properties-panel">
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <span className="panel-header__title">Properties</span>
          <span className="panel-header__type-badge badge badge--mint">
            {type === 'building' ? '🏛️ Building' : type === 'path' ? '🛣️ Path' : type === 'poi' ? '📍 POI' : '❓ Unknown'}
          </span>
        </div>
        <button
          className="btn btn-icon btn-ghost"
          onClick={() => dispatch({ type: ACTIONS.DESELECT })}
          style={{ width: '24px', height: '24px', padding: 0 }}
          title="Close Panel"
          type="button"
        >
          ✕
        </button>
      </div>

      <div className="panel-body">
        {/* Name */}
        <div className="field">
          <label className="field__label">Name</label>
          <input
            id="feature-name-input"
            className="field__input"
            value={form.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="Feature name"
          />
        </div>

        {/* Building-specific */}
        {type === 'building' && (
          <>
            <ColorPicker
              label="Fill Color"
              value={form.color}
              onChange={(c) => handleFieldChange('color', c)}
            />
            <ColorPicker
              label="Border Color"
              value={form.strokeColor}
              onChange={(c) => handleFieldChange('strokeColor', c)}
            />
          </>
        )}

        {/* Path-specific */}
        {type === 'path' && (
          <>
            <ColorPicker
              label="Stroke Color"
              value={form.strokeColor}
              onChange={(c) => handleFieldChange('strokeColor', c)}
            />
            <div className="field">
              <label className="field__label">Stroke Weight ({form.strokeWeight}px)</label>
              <input
                type="range"
                min="1" max="10"
                value={form.strokeWeight}
                onChange={(e) => handleFieldChange('strokeWeight', Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--mint)' }}
              />
            </div>
          </>
        )}

        {/* POI-specific */}
        {type === 'poi' && (
          <>
            <div className="field">
              <label className="field__label">Category</label>
              <select
                className="field__input"
                value={form.category}
                onChange={(e) => handleFieldChange('category', e.target.value)}
              >
                <option value="">None</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="amenity">Amenity</option>
                <option value="academic">Academic</option>
                <option value="navigation">Navigation</option>
                <option value="outdoor">Outdoor</option>
              </select>
            </div>

            <div className="field">
              <label className="field__label">Icon</label>
              <div className="icon-grid">
                {POI_ICONS.map((icon) => (
                  <button
                    key={icon.emoji}
                    className={`icon-cell${form.icon === icon.emoji ? ' selected' : ''}`}
                    onClick={() => handleFieldChange('icon', icon.emoji)}
                    title={icon.label}
                    type="button"
                  >
                    {icon.emoji}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Custom Metadata */}
        <div className="separator" />
        <div className="flex items-center justify-between mb-2">
          <label className="field__label" style={{ margin: 0 }}>Custom Properties</label>
          <button
            className="btn btn-ghost"
            style={{ height: '22px', padding: '0 8px', fontSize: '11px' }}
            onClick={addMetaKey}
            type="button"
          >
            + Add
          </button>
        </div>

        <div className="meta-pairs">
          {Object.entries(form.metadata || {}).map(([key, value]) => (
            <div key={key} className="meta-pair">
              <input
                placeholder="key"
                defaultValue={key}
                onBlur={(e) => updateMetaKey(key, e.target.value, value)}
              />
              <input
                placeholder="value"
                defaultValue={value}
                onBlur={(e) => updateMetaKey(key, key, e.target.value)}
              />
              <button
                className="btn btn-icon btn-ghost"
                onClick={() => removeMetaKey(key)}
                style={{ width: '24px', height: '24px', fontSize: '11px' }}
                type="button"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="separator" />

        {/* Geometry info */}
        <div className="field">
          <label className="field__label">Geometry</label>
          <p className="text-muted text-sm font-mono">{selectedFeature.geometry?.type || 'Unknown'}</p>
        </div>

        <button
          className="btn btn-danger w-full mt-3"
          onClick={() => dispatch({ type: ACTIONS.REMOVE_FEATURE, id: selectedFeature.id })}
          type="button"
        >
          🗑️ Delete Feature
        </button>
      </div>
    </div>
  )
}
