import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
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
      drawText: true,
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
      let featureType = drawingModeRef.current || geometryToFeatureType(geometryType)

      // Default colors per type
      const defaults = {
        building: { color: '#B8F7E4', strokeColor: '#7BE8C9' },
        path:     { color: '#FBBF24', strokeColor: '#FBBF24' },
        poi:      { color: '#F87171', strokeColor: '#F87171' },
        text:     { color: '#FFFFFF', strokeColor: '#FFFFFF' },
        unknown:  { color: '#9CA3AF', strokeColor: '#9CA3AF' },
      }

      let featureName = `${featureType.charAt(0).toUpperCase() + featureType.slice(1)} ${Date.now()}`
      if (e.shape === 'Text') {
        featureType = 'text'
        featureName = layer.options?.text || layer.pm?.getText?.() || 'Text Label'
      }

      const typeDefaults = defaults[featureType] || defaults.unknown

      const feature = {
        geometry: geojson.geometry,
        type: featureType,
        name: featureName,
        color: typeDefaults.color,
        strokeColor: typeDefaults.strokeColor,
        strokeWeight: featureType === 'text' ? 14 : 3,
        category: null,
        icon: featureType === 'poi' ? '📍' : null,
        metadata: {},
      }

      // Remove the temporary layer drawn by Geoman.
      // We wrap it in a setTimeout to avoid issues with Geoman's post-creation logic.
      setTimeout(() => {
        layer.remove()
      }, 0)

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
      // Defer checking globalDrawModeEnabled to the next tick of the event loop.
      // This allows mode-switching transitions (e.g. from building to POI) to complete
      // before determining if draw mode has been completely cancelled.
      setTimeout(() => {
        if (!map.pm.globalDrawModeEnabled()) {
          const currentMode = drawingModeRef.current
          if (['building', 'path', 'poi'].includes(currentMode)) {
            dispatch({ type: ACTIONS.SET_DRAWING_MODE, mode: null })
          }
        }
      }, 0)
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

    // 1. Remove layers that are no longer in the state or are hidden
    renderedLayersRef.current.forEach((layer, featureId) => {
      const feat = currentFeatures.find(f => f.id === featureId)
      if (!currentFeatureIds.has(featureId) || (feat && feat.hidden)) {
        layer.remove()
        renderedLayersRef.current.delete(featureId)
        if (featureLayerRef?.current) {
          featureLayerRef.current.delete(layer._leaflet_id)
        }
        if (map.getContainer() && map.getContainer()._rendered_layers) {
          map.getContainer()._rendered_layers.delete(featureId)
        }
      }
    })

    // 2. Add / Update layers for current features
    currentFeatures.forEach((feature) => {
      if (feature.hidden) return // Skip hidden features

      let existingLayer = renderedLayersRef.current.get(feature.id)

      if (existingLayer) {
        const currentGeo = existingLayer.toGeoJSON().geometry
        if (!coordsEqual(currentGeo.coordinates, feature.geometry.coordinates)) {
          existingLayer.remove()
          renderedLayersRef.current.delete(feature.id)
          if (featureLayerRef?.current) {
            featureLayerRef.current.delete(existingLayer._leaflet_id)
          }
          if (map.getContainer() && map.getContainer()._rendered_layers) {
            map.getContainer()._rendered_layers.delete(feature.id)
          }
          existingLayer = null
        }
      }

      if (!existingLayer) {
        // Create new layer based on type
        let newLayer

        if (feature.type === 'poi') {
          const coords = feature.geometry?.coordinates
          if (!coords) return

          const latlng = L.GeoJSON.coordsToLatLng(coords)
          const emojiIcon = L.divIcon({
            html: `<div style="background: ${feature.color || '#F87171'}; border: ${feature.strokeWeight || 2}px solid ${feature.strokeColor || '#EF4444'}; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">${feature.icon || '📍'}</div>`,
            className: 'poi-div-icon',
            iconSize: [34, 34],
            iconAnchor: [17, 17],
          })
          newLayer = L.marker(latlng, {
            icon: emojiIcon,
            zIndexOffset: 1000,
          })
        } else if (feature.type === 'text') {
          const coords = feature.geometry?.coordinates
          if (!coords) return

          const latlng = L.GeoJSON.coordsToLatLng(coords)
          const textIcon = L.divIcon({
            html: `<div style="color: ${feature.color || '#FFFFFF'}; font-size: ${feature.strokeWeight || 14}px; font-weight: bold; white-space: nowrap; text-shadow: 0 0 4px rgba(0,0,0,0.8);">${feature.name}</div>`,
            className: 'map-text-label',
            iconSize: [100, 20],
            iconAnchor: [50, 10],
          })
          newLayer = L.marker(latlng, {
            icon: textIcon,
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
          // Bind edit events
          newLayer.on('pm:edit pm:dragend', (e) => {
            const geojson = e.target.toGeoJSON()
            dispatch({
              type: ACTIONS.UPDATE_FEATURE,
              id: feature.id,
              updates: { geometry: geojson.geometry },
            })
            pushSnapshot()
          })
          // Save references
          renderedLayersRef.current.set(feature.id, newLayer)
          if (featureLayerRef?.current) {
            featureLayerRef.current.set(newLayer._leaflet_id, feature.id)
          }

          // Expose to map container
          if (map.getContainer()) {
            if (!map.getContainer()._rendered_layers) {
              map.getContainer()._rendered_layers = new Map()
            }
            map.getContainer()._rendered_layers.set(feature.id, newLayer)
          }
        }
      } else {
        // Expose to map container if not already there
        if (map.getContainer()) {
          if (!map.getContainer()._rendered_layers) {
            map.getContainer()._rendered_layers = new Map()
          }
          map.getContainer()._rendered_layers.set(feature.id, existingLayer)
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
          const expectedIconHtml = `<div style="background: ${feature.color || '#F87171'}; border: ${feature.strokeWeight || 2}px solid ${feature.strokeColor || '#EF4444'}; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">${feature.icon || '📍'}</div>`
          const currentIconHtml = existingLayer.options?.icon?.options?.html
          if (currentIconHtml !== expectedIconHtml) {
            existingLayer.setIcon(L.divIcon({
              html: expectedIconHtml,
              className: 'poi-div-icon',
              iconSize: [34, 34],
              iconAnchor: [17, 17],
            }))
          }
        } else if (feature.type === 'text') {
          const expectedHtml = `<div style="color: ${feature.color || '#FFFFFF'}; font-size: ${feature.strokeWeight || 14}px; font-weight: bold; white-space: nowrap; text-shadow: 0 0 4px rgba(0,0,0,0.8);">${feature.name}</div>`
          const currentHtml = existingLayer.options?.icon?.options?.html
          if (currentHtml !== expectedHtml) {
            existingLayer.setIcon(L.divIcon({
              html: expectedHtml,
              className: 'map-text-label',
              iconSize: [100, 20],
              iconAnchor: [50, 10],
            }))
          }
        }
      }

      // Enable/disable edit/drag mode on selection
      const isSelected = state.selectedFeatureId === feature.id
      const targetLayer = newLayer || existingLayer
      if (targetLayer && targetLayer.pm) {
        const isEditing = targetLayer.pm.enabled()
        if (isSelected && !isEditing) {
          targetLayer.pm.enable({ draggable: true, snappable: true })
        } else if (!isSelected && isEditing) {
          targetLayer.pm.disable()
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

// ── Geometrical Comparison Helpers ───────────────────────

function coordsEqual(c1, c2) {
  return JSON.stringify(roundCoords(c1)) === JSON.stringify(roundCoords(c2))
}

function roundCoords(coords) {
  if (typeof coords === 'number') {
    return Math.round(coords * 1000000) / 1000000
  }
  if (Array.isArray(coords)) {
    return coords.map(roundCoords)
  }
  return coords
}
