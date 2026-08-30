/**
 * MapContext — Provides the Leaflet map instance and all layer refs
 * via React context, replacing the DOM anti-pattern of storing refs
 * on container._leaflet_map / container._rendered_layers etc.
 */
import { createContext, useContext, useRef } from 'react'

const MapContext = createContext(null)

export function MapProvider({ children }) {
  /** @type {React.MutableRefObject<import('leaflet').Map | null>} */
  const mapRef = useRef(null)

  /** leaflet internal id → featureId (app id)  */
  const featureLayerRef = useRef(new Map())

  /** featureId → L.Layer (polygon / polyline / marker)  */
  const renderedLayersRef = useRef(new Map())

  /** nodeId → L.CircleMarker  */
  const nodeLayersRef = useRef(new Map())

  /** edgeId → L.Polyline  */
  const edgeLayersRef = useRef(new Map())

  const value = {
    mapRef,
    featureLayerRef,
    renderedLayersRef,
    nodeLayersRef,
    edgeLayersRef,
  }

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>
}

export function useMapContext() {
  const ctx = useContext(MapContext)
  if (!ctx) throw new Error('useMapContext must be used within <MapProvider>')
  return ctx
}
