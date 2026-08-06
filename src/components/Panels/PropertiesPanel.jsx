import { useState, useMemo } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import ColorPicker from '../UI/ColorPicker.jsx'
import { POI_ICONS } from '../../constants/poiIcons.js'
import { straightenAndSnapPath } from '../../lib/pathUtils.js'

export default function PropertiesPanel() {
  const { state, dispatch, pushSnapshot, ACTIONS } = useApp()
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState(null)

  const currentSelectionId = state.selectedFeatureId || state.selectedNodeId || state.selectedEdgeId
  const confirmDelete = confirmDeleteTarget === currentSelectionId

  const handleDeleteClick = () => {
    if (confirmDelete) {
      if (selectedFeature) dispatch({ type: ACTIONS.REMOVE_FEATURE, id: selectedFeature.id })
      if (selectedNode) dispatch({ type: ACTIONS.REMOVE_ROUTING_NODE, id: selectedNode.id })
      if (selectedEdge) dispatch({ type: ACTIONS.REMOVE_ROUTING_EDGE, id: selectedEdge.id })
      setConfirmDeleteTarget(null)
    } else {
      setConfirmDeleteTarget(currentSelectionId)
    }
  }

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
        color: selectedNode.color || '#B8F7E4',
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

  const handleStraighten = () => {
    if (!selectedFeature) return
    const otherFeatures = state.project.features.filter(f => f.id !== selectedFeature.id)
    // Deep clone coordinates to ensure React detects state change
    let coords = JSON.parse(JSON.stringify(selectedFeature.geometry.coordinates))

    if (selectedFeature.type === 'building') {
      const ring = coords[0] || []
      const cleanedRing = straightenAndSnapPath(ring, otherFeatures)
      if (cleanedRing.length > 0) {
        const first = cleanedRing[0]
        const last = cleanedRing[cleanedRing.length - 1]
        if (first[0] !== last[0] || first[1] !== last[1]) {
          cleanedRing.push([first[0], first[1]])
        }
      }
      coords = [cleanedRing]
    } else {
      coords = straightenAndSnapPath(coords, otherFeatures)
    }

    updateFeature({
      geometry: {
        ...selectedFeature.geometry,
        coordinates: coords,
      }
    })

    dispatch({
      type: ACTIONS.SHOW_TOAST,
      message: `${selectedFeature.type === 'building' ? 'Building corners' : 'Path'} straightened and snapped!`,
      toastType: 'success'
    })
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

          <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', margin: 'var(--sp-4) 0' }}>
            <input
              type="checkbox"
              id="edge-bidirectional"
              checked={selectedEdge.bidirectional !== false}
              onChange={(e) => updateEdge({ bidirectional: e.target.checked })}
              style={{ width: '16px', height: '16px', accentColor: 'var(--mint)', cursor: 'pointer' }}
            />
            <label htmlFor="edge-bidirectional" className="field__label" style={{ margin: 0, cursor: 'pointer', textTransform: 'none', fontWeight: 500 }}>
              ↔️ Bidirectional
            </label>
          </div>

          <button
            className="btn btn-danger w-full mt-4"
            onClick={handleDeleteClick}
            style={{ width: '100%', marginTop: 'var(--sp-4)' }}
          >
            {confirmDelete ? '⚠️ Confirm Delete?' : '🗑️ Delete Edge'}
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
          <ColorPicker
            label="Node Color"
            value={form.color || '#B8F7E4'}
            onChange={(c) => updateNode({ color: c })}
          />
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
            onClick={handleDeleteClick}
          >
            {confirmDelete ? '⚠️ Confirm Delete?' : '🗑️ Delete Node'}
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
            {type === 'building' ? '🏛️ Building' : type === 'path' ? '🛣️ Path' : type === 'poi' ? '📍 POI' : type === 'text' ? '📝 Text Label' : '❓ Unknown'}
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

        {/* Category */}
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

        {/* Icon */}
        <div className="field">
          <label className="field__label">Icon / Emoji</label>
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

        <div className="separator" />

        {/* Style configurations */}
        {type === 'text' ? (
          <ColorPicker
            label="Text Color"
            value={form.color}
            onChange={(c) => handleFieldChange('color', c)}
          />
        ) : (
          <>
            {type !== 'path' && (
              <ColorPicker
                label="Fill / Background Color"
                value={form.color}
                onChange={(c) => handleFieldChange('color', c)}
              />
            )}
            <ColorPicker
              label={type === 'path' ? 'Stroke Color' : 'Border Color'}
              value={form.strokeColor}
              onChange={(c) => handleFieldChange('strokeColor', c)}
            />
          </>
        )}

        {/* Stroke / Border / Font Weight */}
        <div className="field">
          <label className="field__label">
            {type === 'text' ? 'Font Size' : type === 'path' ? 'Stroke Width' : 'Border Width'} ({form.strokeWeight}px)
          </label>
          <input
            type="range"
            min={type === 'text' ? 10 : 1}
            max={type === 'text' ? 48 : 10}
            step={type === 'text' ? 1 : 0.5}
            value={form.strokeWeight}
            onChange={(e) => handleFieldChange('strokeWeight', Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--mint)', cursor: 'pointer' }}
          />
        </div>

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

        {(type === 'path' || type === 'building') && (
          <div className="field" style={{ marginTop: '4px', marginBottom: '8px' }}>
            <button
              className="btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                width: '100%',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: 'var(--text-primary)',
                height: '32px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={handleStraighten}
              type="button"
            >
              ✨ Straighten & Snap Corners
            </button>
          </div>
        )}

        <button
          className="btn btn-danger w-full mt-3"
          onClick={handleDeleteClick}
          type="button"
        >
          {confirmDelete ? '⚠️ Confirm Delete?' : '🗑️ Delete Feature'}
        </button>
      </div>
    </div>
  )
}
