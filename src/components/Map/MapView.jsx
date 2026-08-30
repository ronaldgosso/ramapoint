import { useRef, useMemo, useEffect } from 'react'
import { MapContainer, TileLayer, FeatureGroup } from 'react-leaflet'
import { useMap } from 'react-leaflet'
import { useApp } from '../../context/AppContext.jsx'
import { useMapContext } from '../../context/MapContext.jsx'
import { TILE_LAYERS } from '../../constants/tileLayers.js'
import GeomanControls from './GeomanControls.jsx'
import RoutingLayer from './RoutingLayer.jsx'
import TileSwitcher from './TileSwitcher.jsx'
import GeocodingSearch from './GeocodingSearch.jsx'
import UserLocationMarker from './UserLocationMarker.jsx'

// ── Writes the Leaflet map instance into MapContext (replaces DOM hack) ──────
function MapInstanceHook() {
  const map = useMap()
  const { mapRef } = useMapContext()
  useEffect(() => {
    if (map) mapRef.current = map
    return () => { mapRef.current = null }
  }, [map, mapRef])
  return null
}

// ── Fly to a project's saved center whenever the loaded project changes ───────
function ProjectViewSyncer() {
  const map = useMap()
  const { state } = useApp()
  const prevProjectIdRef = useRef(state.project.id)

  useEffect(() => {
    if (state.project.id !== prevProjectIdRef.current) {
      prevProjectIdRef.current = state.project.id
      const [lat, lng] = state.project.center || [40.7128, -74.006]
      map.flyTo([lat, lng], state.project.zoom || 16, { duration: 1.0, easeLinearity: 0.5 })
    }
  }, [state.project.id, state.project.center, state.project.zoom, map])

  return null
}

// ── Geolocation initialiser: only fires once for a brand-new project ──────────
function LocationInitializer() {
  const map = useMap()
  const { state, dispatch, ACTIONS } = useApp()
  const { project } = state
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const isDefault = project.center &&
      project.center[0] === 40.7128 && project.center[1] === -74.006

    if (isDefault && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latlng = [position.coords.latitude, position.coords.longitude]
          map.setView(latlng, 16)
          dispatch({
            type: ACTIONS.SET_PROJECT,
            project: { ...project, center: latlng },
          })
        },
        (error) => {
          console.warn('Geolocation denied or failed, using default center:', error)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    }
  }, [map, project, dispatch, ACTIONS])

  return null
}

// ── Main MapView component ────────────────────────────────────────────────────
export default function MapView() {
  const { state } = useApp()
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
        <ProjectViewSyncer />
        <UserLocationMarker />

         {!state.activeModal && (() => {
          let tileUrl = tileConfig.url
          if (activeTileLayer === 'mapbox') {
            const token = state.mapboxToken || import.meta.env.VITE_MAPBOX_TOKEN || ''
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
          <GeomanControls />
        </FeatureGroup>

        <RoutingLayer />
      </MapContainer>

      <TileSwitcher />
      <GeocodingSearch />

      {state.drawingMode && (
        <div className="draw-hint" role="status" aria-live="polite">
          {state.drawingMode === 'node' && '🔵 Click map to place routing node'}
          {state.drawingMode === 'edge' && '↗️ Click node A → node B to draw edge'}
          {state.drawingMode === 'route' && (
            state.routeResult
              ? `✅ Route: ${state.routeResult.distance}m · ~${Math.ceil(state.routeResult.walkTime / 60)} min walk`
              : '🗺️ Click start node → end node to find shortest path'
          )}
          {!['node', 'edge', 'route'].includes(state.drawingMode) && `Drawing: ${state.drawingMode}`}
        </div>
      )}
    </div>
  )
}
