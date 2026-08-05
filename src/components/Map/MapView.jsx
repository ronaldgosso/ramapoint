import { useRef, useMemo, useEffect } from 'react'
import { MapContainer, TileLayer, FeatureGroup, useMap } from 'react-leaflet'
import { useApp } from '../../context/AppContext.jsx'
import { TILE_LAYERS } from '../../constants/tileLayers.js'
import GeomanControls from './GeomanControls.jsx'
import RoutingLayer from './RoutingLayer.jsx'
import TileSwitcher from './TileSwitcher.jsx'

// Helper component to attach the Leaflet map instance to the DOM container
// so the status bar's tile caching logic can access it.
function MapInstanceHook() {
  const map = useMap()
  useEffect(() => {
    if (map) {
      const container = map.getContainer()
      container._leaflet_map = map
    }
  }, [map])
  return null
}

// Helper component to initialize map view to user location if project center is default
function LocationInitializer() {
  const map = useMap()
  const { state, dispatch, ACTIONS } = useApp()
  const { project } = state
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const isDefault = project.center && project.center[0] === 40.7128 && project.center[1] === -74.006

    if (isDefault && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latlng = [position.coords.latitude, position.coords.longitude]
          map.setView(latlng, 16)
          dispatch({
            type: ACTIONS.SET_PROJECT,
            project: {
              ...project,
              center: latlng,
            },
          })
        },
        (error) => {
          console.warn("Geolocation denied or failed, using default center:", error)
        },
        { enableHighAccuracy: true, timeout: 5000 }
      )
    }
  }, [map, project, dispatch, ACTIONS])

  return null
}

export default function MapView() {
  const { state } = useApp()
  const featureLayerRef = useRef(new Map())
  const { project, activeTileLayer } = state
  const tileConfig = TILE_LAYERS[activeTileLayer] || TILE_LAYERS.carto

  const center = useMemo(
    () => project.center || [40.7128, -74.006],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []  // Only use initial value — map controls its own viewport
  )

  const zoom = useMemo(
    () => project.zoom || 16,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  return (
    <div className="map-area" id="map-area">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        attributionControl={true}
        preferCanvas={false}
      >
        <MapInstanceHook />
        <LocationInitializer />

        {!state.activeModal && (
          <TileLayer
            key={activeTileLayer}
            url={tileConfig.url}
            attribution={tileConfig.attribution}
            maxZoom={tileConfig.maxZoom}
            subdomains={tileConfig.subdomains || 'abc'}
          />
        )}

        <FeatureGroup>
          <GeomanControls featureLayerRef={featureLayerRef} />
        </FeatureGroup>

        <RoutingLayer />
      </MapContainer>

      <TileSwitcher />

      {state.drawingMode && (
        <div className="draw-hint">
          {state.drawingMode === 'node' && '🔵 Click map to place routing node'}
          {state.drawingMode === 'edge' && '↗️ Click node A → node B to draw edge'}
          {!['node', 'edge'].includes(state.drawingMode) && `Drawing: ${state.drawingMode}`}
        </div>
      )}
    </div>
  )
}
