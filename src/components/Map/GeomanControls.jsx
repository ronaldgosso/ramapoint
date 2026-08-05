import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { useApp } from '../../context/AppContext.jsx'
import { geometryToFeatureType } from '../../lib/geojsonBuilder.js'

/**
 * GeomanControls — Initializes Leaflet-Geoman and handles drawing events
 * Must be rendered as a child of MapContainer (uses useMap hook)
 */
export default function GeomanControls({ featureLayerRef }) {
  const map = useMap()
  const { state, dispatch, pushSnapshot, ACTIONS } = useApp()
  const drawingModeRef = useRef(state.drawingMode)
  const initialized = useRef(false)

  // Sync drawingMode ref
  useEffect(() => {
    drawingModeRef.current = state.drawingMode
  }, [state.drawingMode])

  // Initialize Geoman controls
  useEffect(() => {
    if (!map || !map.pm || initialized.current) return
    initialized.current = true

    map.pm.addControls({
      position: 'topleft',
      drawControls: true,
      editControls: true,
      optionsControls: true,
      customControls: false,
      drawMarker: true,
      drawCircleMarker: false,
      drawPolyline: true,
      drawRectangle: true,
      drawPolygon: true,
      drawCircle: false,
      drawText: false,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      removalMode: true,
      rotateMode: false,
    })

    // Global Geoman options
    map.pm.setGlobalOptions({
      snappable: true,
      snapDistance: 15,
      allowSelfIntersection: false,
    })
  }, [map])

  // Handle feature creation
  useEffect(() => {
    if (!map || !map.pm) return

    const handleCreate = (e) => {
      const { layer } = e
      if (!layer) return

      const geojson = layer.toGeoJSON()
      const geometryType = geojson.geometry?.type
      const featureType = drawingModeRef.current || geometryToFeatureType(geometryType)

      // Default colors per type
      const defaults = {
        building: { color: '#B8F7E4', strokeColor: '#7BE8C9' },
        path:     { color: '#FBBF24', strokeColor: '#FBBF24' },
        poi:      { color: '#F87171', strokeColor: '#F87171' },
        unknown:  { color: '#9CA3AF', strokeColor: '#9CA3AF' },
      }

      const typeDefaults = defaults[featureType] || defaults.unknown

      const feature = {
        geometry: geojson.geometry,
        type: featureType,
        name: `${featureType.charAt(0).toUpperCase() + featureType.slice(1)} ${Date.now()}`,
        color: typeDefaults.color,
        strokeColor: typeDefaults.strokeColor,
        strokeWeight: 3,
        category: null,
        icon: featureType === 'poi' ? '📍' : null,
        metadata: {},
        leafletId: map.getPane ? layer._leaflet_id : null,
      }

      dispatch({ type: ACTIONS.ADD_FEATURE, feature })
      pushSnapshot()

      // Style the layer
      styleLayer(layer, featureType, typeDefaults)

      // Store leaflet ID mapping
      if (featureLayerRef?.current) {
        featureLayerRef.current.set(layer._leaflet_id, feature.id)
      }
    }

    const handleEdit = (e) => {
      const { layer } = e
      if (!layer) return

      const geojson = layer.toGeoJSON()
      const leafletId = layer._leaflet_id
      const featureId = featureLayerRef?.current?.get(leafletId)

      if (featureId) {
        dispatch({
          type: ACTIONS.UPDATE_FEATURE,
          id: featureId,
          updates: { geometry: geojson.geometry },
        })
        pushSnapshot()
      }
    }

    const handleRemove = (e) => {
      const { layer } = e
      if (!layer) return

      const leafletId = layer._leaflet_id
      const featureId = featureLayerRef?.current?.get(leafletId)

      if (featureId) {
        dispatch({ type: ACTIONS.REMOVE_FEATURE, id: featureId })
        featureLayerRef?.current?.delete(leafletId)
        pushSnapshot()
      }
    }

    const handleSelect = (e) => {
      const { layer } = e
      if (!layer) return
      const leafletId = layer._leaflet_id
      const featureId = featureLayerRef?.current?.get(leafletId)
      if (featureId) {
        dispatch({ type: ACTIONS.SELECT_FEATURE, id: featureId })
      }
    }

    map.on('pm:create', handleCreate)
    map.on('pm:edit', handleEdit)
    map.on('pm:remove', handleRemove)
    map.on('pm:actionclick', handleSelect)
    // Also listen to layer click for selection
    map.on('click', (e) => {
      // Only deselect if clicking bare map
      if (!e.sourceTarget || e.sourceTarget === map) {
        // Don't deselect — let users keep selection
      }
    })

    return () => {
      map.off('pm:create', handleCreate)
      map.off('pm:edit', handleEdit)
      map.off('pm:remove', handleRemove)
      map.off('pm:actionclick', handleSelect)
    }
  }, [map, dispatch, pushSnapshot, featureLayerRef, ACTIONS])

  return null
}

function styleLayer(layer, featureType, colors) {
  try {
    if (layer.setStyle) {
      if (featureType === 'building') {
        layer.setStyle({
          color: colors.strokeColor,
          fillColor: colors.color,
          fillOpacity: 0.35,
          weight: 2,
        })
      } else if (featureType === 'path') {
        layer.setStyle({
          color: colors.strokeColor,
          weight: 3,
          opacity: 0.85,
        })
      }
    }
  } catch {
    // Layer doesn't support setStyle (e.g. Marker)
  }
}
