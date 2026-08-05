import { useApp } from '../../context/AppContext.jsx'
import { TILE_LAYER_LIST } from '../../constants/tileLayers.js'

/**
 * TileSwitcher — Floating glass card for selecting the map tile layer
 */
export default function TileSwitcher() {
  const { state, dispatch, ACTIONS } = useApp()

  return (
    <div className="tile-switcher">
      <div className="tile-switcher__label">Base Map</div>
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
    </div>
  )
}
