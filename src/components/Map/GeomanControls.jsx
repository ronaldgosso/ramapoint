import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { useApp } from '../../context/AppContext.jsx'
import { geometryToFeatureType } from '../../lib/geojsonBuilder.js'

/**
 * GeomanControls — Initializes Leaflet-Geoman and handles drawing events.
 * Also synchronizes the features from state.project.features onto the map,
 * allowing full editing, styling, and persistence of loaded layers.
 */
export default function GeomanControls({ featureLayerRef }) {
  const map = useMap()
  const { state, dispatch, pushSnapshot, ACTIONS } = useApp()
  const drawingModeRef = useRef(state.drawingMode)
  const initialized = useRef(false)
  const renderedLayersRef = useRef(new Map()) // featureId -> L.Layer

  // Sync drawingMode ref
  useEffect(() => {
    drawingModeRef.current = state.drawingMode
  }, [state.drawingMode])

  // Sync toolbar drawingMode with Leaflet-Geoman modes
  useEffect(() => {
    if (!map || !map.pm) return

    const mode = state.drawingMode
    const modeToShape = {
      building: 'Polygon',
      path: 'Line',
      poi: 'Marker',
    }

    const targetShape = modeToShape[mode]

    if (targetShape) {
      map.pm.enableDraw(targetShape, {
        snappable: true,
        snapDistance: 15,
      })
    } else {
      if (map.pm.globalDrawModeEnabled()) {
        map.pm.disableDraw()
      }
    }
  }, [state.drawingMode, map])

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
      }

      // Remove the temporary layer drawn by Geoman.
      // The sync effect below will instantiate a clean, reactive layer for this feature.
      layer.remove()

      dispatch({ type: ACTIONS.ADD_FEATURE, feature })
      pushSnapshot()
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
        if (featureLayerRef?.current) {
          featureLayerRef.current.delete(leafletId)
        }
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

    const handleDrawEnd = () => {
      if (!map.pm.globalDrawModeEnabled()) {
        const currentMode = drawingModeRef.current
        if (['building', 'path', 'poi'].includes(currentMode)) {
          dispatch({ type: ACTIONS.SET_DRAWING_MODE, mode: null })
        }
      }
    }

    map.on('pm:create', handleCreate)
    map.on('pm:edit', handleEdit)
    map.on('pm:remove', handleRemove)
    map.on('pm:actionclick', handleSelect)
    map.on('pm:drawend', handleDrawEnd)

    return () => {
      map.off('pm:create', handleCreate)
      map.off('pm:edit', handleEdit)
      map.off('pm:remove', handleRemove)
      map.off('pm:actionclick', handleSelect)
      map.off('pm:drawend', handleDrawEnd)
    }
  }, [map, dispatch, pushSnapshot, featureLayerRef, ACTIONS])

  // Synchronize state.project.features with the Leaflet Map
  useEffect(() => {
    if (!map) return

    const currentFeatures = state.project.features || []
    const currentFeatureIds = new Set(currentFeatures.map(f => f.id))

    // 1. Remove layers that are no longer in the state
    renderedLayersRef.current.forEach((layer, featureId) => {
      if (!currentFeatureIds.has(featureId)) {
        layer.remove()
        renderedLayersRef.current.delete(featureId)
        if (featureLayerRef?.current) {
          featureLayerRef.current.delete(layer._leaflet_id)
        }
      }
    })

    // 2. Add / Update layers for current features
    currentFeatures.forEach((feature) => {
      const existingLayer = renderedLayersRef.current.get(feature.id)

      if (!existingLayer) {
        // Create new layer based on type
        let newLayer

        if (feature.type === 'poi') {
          const coords = feature.geometry?.coordinates
          if (!coords) return

          const latlng = L.GeoJSON.coordsToLatLng(coords)
          const emojiIcon = L.divIcon({
            html: `<span style="font-size: 28px; line-height: 1;">${feature.icon || '📍'}</span>`,
            className: 'poi-div-icon',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          })
          newLayer = L.marker(latlng, {
            icon: emojiIcon,
            zIndexOffset: 1000,
          })
        } else if (feature.type === 'building') {
          const latlngs = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates, 1)
          newLayer = L.polygon(latlngs, {
            color: feature.strokeColor || '#7BE8C9',
            fillColor: feature.color || '#B8F7E4',
            fillOpacity: 0.35,
            weight: feature.strokeWeight || 2,
          })
        } else {
          // path / unknown
          const latlngs = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates, 0)
          newLayer = L.polyline(latlngs, {
            color: feature.strokeColor || '#FBBF24',
            weight: feature.strokeWeight || 3,
            opacity: 0.85,
          })
        }

        if (newLayer) {
          newLayer.addTo(map)

          // Bind click event for selecting features
          newLayer.on('click', (e) => {
            L.DomEvent.stopPropagation(e)
            dispatch({ type: ACTIONS.SELECT_FEATURE, id: feature.id })
          })

          // Save references
          renderedLayersRef.current.set(feature.id, newLayer)
          if (featureLayerRef?.current) {
            featureLayerRef.current.set(newLayer._leaflet_id, feature.id)
          }
        }
      } else {
        // Update geometry of existing layer if it changed outside of direct Geoman dragging
        // (e.g. undo/redo, reloading project)
        const currentGeo = existingLayer.toGeoJSON().geometry
        if (JSON.stringify(currentGeo) !== JSON.stringify(feature.geometry)) {
          if (feature.type === 'poi') {
            existingLayer.setLatLng(L.GeoJSON.coordsToLatLng(feature.geometry.coordinates))
          } else {
            const depth = feature.type === 'building' ? 1 : 0
            existingLayer.setLatLngs(L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates, depth))
          }
        }

        // Update styling/properties of existing layer
        if (feature.type === 'building') {
          existingLayer.setStyle({
            color: feature.strokeColor,
            fillColor: feature.color,
            fillOpacity: 0.35,
            weight: feature.strokeWeight || 2,
          })
        } else if (feature.type === 'path') {
          existingLayer.setStyle({
            color: feature.strokeColor,
            weight: feature.strokeWeight || 3,
            opacity: 0.85,
          })
        } else if (feature.type === 'poi') {
          const expectedIconHtml = `<span style="font-size: 28px; line-height: 1;">${feature.icon || '📍'}</span>`
          const currentIconHtml = existingLayer.options?.icon?.options?.html
          if (currentIconHtml !== expectedIconHtml) {
            existingLayer.setIcon(L.divIcon({
              html: expectedIconHtml,
              className: 'poi-div-icon',
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            }))
          }
        }
      }
    })
  }, [state.project.features, map, dispatch, ACTIONS, featureLayerRef])

  // Cleanup all rendered layers when unmounting or changing
  useEffect(() => {
    return () => {
      renderedLayersRef.current.forEach((layer) => {
        layer.remove()
      })
      renderedLayersRef.current.clear()
      if (featureLayerRef?.current) {
        featureLayerRef.current.clear()
      }
    }
  }, [featureLayerRef])

  return null
}
