import { useRef, useMemo } from 'react'
import { MapContainer, TileLayer, FeatureGroup } from 'react-leaflet'
import { useApp } from '../../context/AppContext.jsx'
import { TILE_LAYERS } from '../../constants/tileLayers.js'
import GeomanControls from './GeomanControls.jsx'
import RoutingLayer from './RoutingLayer.jsx'
import TileSwitcher from './TileSwitcher.jsx'

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
        <TileLayer
          key={activeTileLayer}
          url={tileConfig.url}
          attribution={tileConfig.attribution}
          maxZoom={tileConfig.maxZoom}
          subdomains={tileConfig.subdomains || 'abc'}
        />

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
