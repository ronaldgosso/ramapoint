import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { TILE_LAYER_LIST } from '../../constants/tileLayers.js'

/**
 * TileSwitcher — Floating glass card for selecting the map tile layer and managing key tokens
 */
export default function TileSwitcher() {
  const { state, dispatch, ACTIONS } = useApp()
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="tile-switcher">
      <div className="tile-switcher__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <div className="tile-switcher__label" style={{ margin: 0 }}>Base Map</div>
        <button
          className="btn btn-icon btn-ghost"
          style={{ width: '22px', height: '22px', fontSize: '11px', padding: 0 }}
          onClick={() => setShowSettings(!showSettings)}
          title="Map API Key Settings"
        >
          ⚙️
        </button>
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
