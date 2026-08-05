/**
 * Tile coordinate utilities
 * Convert between lat/lng and tile XY at a given zoom level
 */

/**
 * Convert lat/lng to tile XY coordinates at zoom level z
 */
export function latLngToTile(lat, lng, zoom) {
  const n = Math.pow(2, zoom)
  const x = Math.floor(((lng + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
  return { x, y, z: zoom }
}

/**
 * Convert tile XY + zoom to lat/lng of the tile's top-left corner
 */
export function tileToLatLng(x, y, zoom) {
  const n = Math.pow(2, zoom)
  const lng = (x / n) * 360 - 180
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)))
  const lat = (latRad * 180) / Math.PI
  return { lat, lng }
}

/**
 * Get all tile coordinates within a bounding box for a given zoom range
 * @param {Object} bounds - { north, south, east, west } in degrees
 * @param {number} minZoom
 * @param {number} maxZoom
 * @returns {Array} Array of { x, y, z } tile coords
 */
export function getTilesInBounds(bounds, minZoom, maxZoom) {
  const tiles = []

  for (let z = minZoom; z <= maxZoom; z++) {
    const topLeft = latLngToTile(bounds.north, bounds.west, z)
    const bottomRight = latLngToTile(bounds.south, bounds.east, z)

    const xMin = Math.max(0, topLeft.x)
    const xMax = Math.min(Math.pow(2, z) - 1, bottomRight.x)
    const yMin = Math.max(0, topLeft.y)
    const yMax = Math.min(Math.pow(2, z) - 1, bottomRight.y)

    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        tiles.push({ x, y, z })
      }
    }
  }

  return tiles
}

/**
 * Get a tile URL for a given tile source
 */
export function buildTileUrl(tileLayer, x, y, z) {
  const { url, subdomains } = tileLayer
  const subdomain = subdomains
    ? subdomains[Math.abs(x + y) % subdomains.length]
    : null

  return url
    .replace('{s}', subdomain || 'a')
    .replace('{x}', x)
    .replace('{y}', y)
    .replace('{z}', z)
    .replace('{r}', window.devicePixelRatio > 1 ? '@2x' : '')
}

/**
 * Count total tiles in bounding box across zoom range
 */
export function countTiles(bounds, minZoom, maxZoom) {
  let total = 0
  for (let z = minZoom; z <= maxZoom; z++) {
    const topLeft = latLngToTile(bounds.north, bounds.west, z)
    const bottomRight = latLngToTile(bounds.south, bounds.east, z)
    const xCount = bottomRight.x - topLeft.x + 1
    const yCount = bottomRight.y - topLeft.y + 1
    total += Math.max(0, xCount) * Math.max(0, yCount)
  }
  return total
}

/**
 * Extract map bounds from a Leaflet map instance
 */
export function getBoundsFromMap(map) {
  const bounds = map.getBounds()
  return {
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    east:  bounds.getEast(),
    west:  bounds.getWest(),
  }
}
