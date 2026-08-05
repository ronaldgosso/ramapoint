import { useState, useCallback, useRef } from 'react'
import { getTilesInBounds, buildTileUrl, getBoundsFromMap } from '../lib/tileUtils.js'
import { TILE_LAYERS } from '../constants/tileLayers.js'

const CONCURRENT_DOWNLOADS = 6

/**
 * Hook to pre-cache tiles for offline use
 * Uses Workbox's runtime caching interceptor — just fetching the URL is enough
 */
export function useTileCache() {
  const [isCaching, setIsCaching] = useState(false)
  const [cached, setCached] = useState(0)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState(null)
  const abortRef = useRef(false)

  const cacheTiles = useCallback(async (mapInstance, minZoom, maxZoom) => {
    if (!mapInstance) return

    setError(null)
    setCached(0)
    abortRef.current = false

    const bounds = getBoundsFromMap(mapInstance)
    const tileIds = getTilesInBounds(bounds, minZoom, maxZoom)

    // Limit to 3000 tiles max to avoid quota issues
    const limited = tileIds.slice(0, 3000)
    setTotal(limited.length)

    if (limited.length === 0) {
      setError('No tiles in current view')
      return
    }

    setIsCaching(true)
    let done = 0

    // Build URLs for all tile layers
    const allUrls = []
    Object.values(TILE_LAYERS).forEach((layer) => {
      limited.forEach(({ x, y, z }) => {
        allUrls.push(buildTileUrl(layer, x, y, z))
      })
    })

    // Fetch in batches of CONCURRENT_DOWNLOADS
    const chunked = []
    for (let i = 0; i < allUrls.length; i += CONCURRENT_DOWNLOADS) {
      chunked.push(allUrls.slice(i, i + CONCURRENT_DOWNLOADS))
    }

    for (const chunk of chunked) {
      if (abortRef.current) break

      await Promise.allSettled(
        chunk.map(async (url) => {
          try {
            await fetch(url, { mode: 'no-cors' })
          } catch {
            // Silently ignore individual tile failures
          }
          done++
          setCached(Math.round((done / allUrls.length) * limited.length))
        })
      )
    }

    setIsCaching(false)
    if (!abortRef.current) {
      setCached(limited.length)
    }
  }, [])

  const cancelCache = useCallback(() => {
    abortRef.current = true
    setIsCaching(false)
  }, [])

  const progress = total > 0 ? Math.round((cached / total) * 100) : 0

  return { isCaching, cached, total, progress, error, cacheTiles, cancelCache }
}
