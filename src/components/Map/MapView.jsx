import { useRef, useMemo, useEffect, useState } from 'react'
import { MapContainer, TileLayer, FeatureGroup, useMap, Marker, Popup } from 'react-leaflet'
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

function UserLocationMarker() {
  const [position, setPosition] = useState(null)
  
  useEffect(() => {
    if (!navigator.geolocation) return

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude])
      },
      (err) => {
        console.warn("Could not watch user location:", err)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  if (!position) return null

  const userIcon = window.L ? window.L.divIcon({
    html: '<div class="user-location-pulse"></div>',
    className: 'user-location-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  }) : null

  return (
    <Marker position={position} icon={userIcon}>
      <Popup>
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-ui)', fontSize: '12px' }}>
          <strong>You are here</strong>
          <div style={{ opacity: 0.7, marginTop: '2px' }}>
            {position[0].toFixed(5)}, {position[1].toFixed(5)}
          </div>
        </div>
      </Popup>
    </Marker>
  )
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
        <UserLocationMarker />

         {!state.activeModal && (() => {
          let tileUrl = tileConfig.url
          if (activeTileLayer === 'mapbox') {
            const token = state.mapboxToken || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTAwY2kycW01em91NDhrOHIifQ.egBRK-GmrQM94n1wM0wOiw'
            tileUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${token}`
          } else if (activeTileLayer === 'google') {
            const keyParam = state.googleApiKey ? `&key=${state.googleApiKey}` : ''
            tileUrl = `https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}${keyParam}`
          }

          return (
            <TileLayer
              key={activeTileLayer}
              url={tileUrl}
              attribution={tileConfig.attribution}
              maxZoom={tileConfig.maxZoom}
              subdomains={tileConfig.subdomains || 'abc'}
            />
          )
        })()}

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
