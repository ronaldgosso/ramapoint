/**
 * Build a valid GeoJSON FeatureCollection from Leaflet-Geoman layers
 * @param {Array} features - Array of feature objects from app state
 * @returns {Object} GeoJSON FeatureCollection
 */
export function buildGeoJSON(features) {
  const featureList = features.map((f) => {
    const geojsonFeature = {
      type: 'Feature',
      id: f.id,
      geometry: f.geometry,
      properties: {
        id: f.id,
        name: f.name || '',
        type: f.type || 'unknown',
        color: f.color || '#B8F7E4',
        strokeColor: f.strokeColor || '#B8F7E4',
        strokeWeight: f.strokeWeight || 3,
        category: f.category || null,
        icon: f.icon || null,
        ...f.metadata,
      },
    }
    return geojsonFeature
  })

  return {
    type: 'FeatureCollection',
    features: featureList,
    metadata: {
      generator: 'RamaPoint',
      version: '1.0.0',
      created: new Date().toISOString(),
      featureCount: featureList.length,
    },
  }
}

/**
 * Parse a Leaflet layer and extract its GeoJSON geometry
 * @param {Object} layer - Leaflet layer instance
 * @returns {Object|null} GeoJSON geometry
 */
export function layerToGeometry(layer) {
  try {
    const geojson = layer.toGeoJSON()
    return geojson.geometry || geojson
  } catch {
    return null
  }
}

/**
 * Determine the feature type from geometry type
 */
export function geometryToFeatureType(geometryType) {
  switch (geometryType) {
    case 'Polygon':
    case 'MultiPolygon':
      return 'building'
    case 'LineString':
    case 'MultiLineString':
      return 'path'
    case 'Point':
      return 'poi'
    default:
      return 'unknown'
  }
}
