import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { TILE_LAYER_LIST } from '../../constants/tileLayers.js'

/**
 * TileSwitcher — Floating glass card for selecting the map tile layer and managing key tokens
 */
export default function TileSwitcher() {
  const { state, dispatch, ACTIONS } = useApp()
  const [showSettings, setShowSettings] = useState(false)

  const handleLocate = () => {
    if (!navigator.geolocation) {
      dispatch({ type: ACTIONS.SHOW_TOAST, message: 'Geolocation is not supported by your browser', toastType: 'warn' })
      return
    }

    const mapEl = document.getElementById('map-area')
    if (!mapEl) return
    const mapContainer = mapEl.querySelector('.leaflet-container')
    if (!mapContainer || !mapContainer._leaflet_map) {
      dispatch({ type: ACTIONS.SHOW_TOAST, message: 'Map not ready yet', toastType: 'warn' })
      return
    }
    const map = mapContainer._leaflet_map

    dispatch({ type: ACTIONS.SHOW_TOAST, message: 'Locating...', toastType: 'info' })

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng = [pos.coords.latitude, pos.coords.longitude]
        map.setView(latlng, 18)

        // Save to project if currently using default center
        const isDefault = state.project.center && state.project.center[0] === 40.7128 && state.project.center[1] === -74.006
        if (isDefault) {
          dispatch({
            type: ACTIONS.SET_PROJECT,
            project: {
              ...state.project,
              center: latlng,
              zoom: 18,
            },
          })
          dispatch({ type: ACTIONS.SHOW_TOAST, message: 'Campus center updated and saved!', toastType: 'success' })
        } else {
          dispatch({ type: ACTIONS.SHOW_TOAST, message: 'Centered on GPS location', toastType: 'success' })
        }
      },
      (err) => {
        dispatch({ type: ACTIONS.SHOW_TOAST, message: 'Locate failed: ' + err.message, toastType: 'error' })
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }
  const handleSetCenter = () => {
    const mapEl = document.getElementById('map-area')
    if (!mapEl) return
    const mapContainer = mapEl.querySelector('.leaflet-container')
    if (!mapContainer || !mapContainer._leaflet_map) {
      dispatch({ type: ACTIONS.SHOW_TOAST, message: 'Map not ready yet', toastType: 'warn' })
      return
    }
    const map = mapContainer._leaflet_map
    const center = map.getCenter()
    const zoom = map.getZoom()

    dispatch({
      type: ACTIONS.SET_PROJECT,
      project: {
        ...state.project,
        center: [center.lat, center.lng],
        zoom: zoom,
      },
    })
    dispatch({ type: ACTIONS.SHOW_TOAST, message: `Saved center: ${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`, toastType: 'success' })
  }

  return (
    <div className="tile-switcher">
      <div className="tile-switcher__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <div className="tile-switcher__label" style={{ margin: 0 }}>Base Map</div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className="btn btn-icon btn-ghost"
            style={{ width: '22px', height: '22px', fontSize: '11px', padding: 0 }}
            onClick={handleLocate}
            title="Center on my location (GPS)"
          >
            🎯
          </button>
          <button
            className="btn btn-icon btn-ghost"
            style={{ width: '22px', height: '22px', fontSize: '11px', padding: 0 }}
            onClick={handleSetCenter}
            title="Save current view as project center"
          >
            📌
          </button>
          <button
            className="btn btn-icon btn-ghost"
            style={{ width: '22px', height: '22px', fontSize: '11px', padding: 0 }}
            onClick={() => setShowSettings(!showSettings)}
            title="Map API Key Settings"
          >
            ⚙️
          </button>
        </div>
      </div>

      {!showSettings ? (
        <>
          {TILE_LAYER_LIST.map((layer) => (
            <button
              key={layer.id}
              id={`tile-btn-${layer.id}`}
              className={`tile-btn${state.activeTileLayer === layer.id ? ' active' : ''}`}
              onClick={() => dispatch({ type: ACTIONS.SET_TILE_LAYER, layerId: layer.id })}
              title={layer.description}
            >
              <span className="tile-btn__thumb">{layer.emoji}</span>
              {layer.name}
            </button>
          ))}
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 0', minWidth: '160px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>API KEY SETTINGS</div>
          
          <div className="field" style={{ margin: 0 }}>
            <label className="field__label" style={{ fontSize: '10px', marginBottom: '2px' }}>Mapbox Access Token</label>
            <input
              type="password"
              className="field__input"
              style={{ fontSize: '11px', padding: '4px 8px', height: '28px' }}
              placeholder="pk.eyJ1..."
              value={state.mapboxToken}
              onChange={(e) => dispatch({ type: 'SET_MAPBOX_TOKEN', token: e.target.value })}
            />
          </div>

          <div className="field" style={{ margin: 0 }}>
            <label className="field__label" style={{ fontSize: '10px', marginBottom: '2px' }}>Google Maps Key</label>
            <input
              type="password"
              className="field__input"
              style={{ fontSize: '11px', padding: '4px 8px', height: '28px' }}
              placeholder="AIzaSy..."
              value={state.googleApiKey}
              onChange={(e) => dispatch({ type: 'SET_GOOGLE_KEY', key: e.target.value })}
            />
          </div>

          <button
            className="btn btn-primary"
            style={{ fontSize: '11px', height: '26px', padding: 0 }}
            onClick={() => setShowSettings(false)}
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}
