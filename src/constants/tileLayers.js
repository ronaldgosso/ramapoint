// Tile layer definitions — supports custom API keys/tokens
export const TILE_LAYERS = {
  osm: {
    id: 'osm',
    name: 'OpenStreetMap',
    emoji: '🗺️',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    subdomains: 'abc',
    description: 'Detailed street map',
  },
  carto: {
    id: 'carto',
    name: 'Positron',
    emoji: '🌐',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
    subdomains: 'abcd',
    description: 'Dark minimal basemap',
  },
  esri: {
    id: 'esri',
    name: 'Satellite',
    emoji: '🛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18,
    subdomains: null,
    description: 'Satellite imagery',
  },
  mapbox: {
    id: 'mapbox',
    name: 'Mapbox',
    emoji: '🗺️',
    url: '', // Resolved dynamically in MapView
    attribution: '&copy; <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 22,
    subdomains: null,
    description: 'Mapbox premium layers (API Token required)',
  },
  google: {
    id: 'google',
    name: 'Google Maps',
    emoji: '🚦',
    url: '', // Resolved dynamically in MapView
    attribution: '&copy; <a href="https://maps.google.com/">Google</a>',
    maxZoom: 21,
    subdomains: null,
    description: 'Google Maps roadmap layer (API Key optional)',
  },
}

export const TILE_LAYER_LIST = Object.values(TILE_LAYERS)
