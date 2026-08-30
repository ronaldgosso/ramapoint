import { useState, useRef, useCallback } from 'react'
import { useMapContext } from '../../context/MapContext.jsx'

/**
 * GeocodingSearch — Nominatim-powered location search bar.
 * Renders as an absolutely-positioned overlay on the map area.
 * Uses MapContext.mapRef to fly the map to the selected result.
 */
export default function GeocodingSearch() {
  const { mapRef } = useMapContext()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  const search = useCallback(async (q) => {
    if (q.trim().length < 3) {
      setResults([])
      setIsOpen(false)
      return
    }
    setLoading(true)
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=0`
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'RamaPoint/1.0' },
      })
      const data = await res.json()
      setResults(data)
      setIsOpen(data.length > 0)
    } catch {
      // Silently fail — geocoding is non-critical
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInput = (e) => {
    const q = e.target.value
    setQuery(q)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 400)
  }

  const handleSelect = (result) => {
    const lat = parseFloat(result.lat)
    const lon = parseFloat(result.lon)
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lon], 17, { duration: 1.5, easeLinearity: 0.4 })
    }
    // Show only the first part of the address in the input
    setQuery(result.display_name.split(',')[0])
    setResults([])
    setIsOpen(false)
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setIsOpen(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') handleClear()
  }

  return (
    <div className="geocoding-search" ref={containerRef}>
      <div className="geocoding-search__input-wrap">
        <span className="geocoding-search__icon" aria-hidden="true">🔍</span>
        <input
          id="geocoding-search-input"
          type="text"
          className="geocoding-search__input"
          value={query}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Search location…"
          aria-label="Search for a location"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          autoComplete="off"
        />
        {loading && (
          <span className="geocoding-search__spinner animate-spin" aria-label="Searching…">⟳</span>
        )}
        {query && !loading && (
          <button
            className="geocoding-search__clear"
            onClick={handleClear}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul
          className="geocoding-search__results"
          role="listbox"
          aria-label="Search results"
        >
          {results.map((r) => (
            <li
              key={r.place_id}
              className="geocoding-search__result-item"
              onClick={() => handleSelect(r)}
              onKeyDown={(e) => e.key === 'Enter' && handleSelect(r)}
              role="option"
              tabIndex={0}
              aria-selected="false"
            >
              <span className="geocoding-search__result-type" aria-hidden="true">
                {r.type === 'university' || r.type === 'college' ? '🏫'
                  : r.class === 'building' ? '🏛️'
                  : r.class === 'highway' ? '🛣️'
                  : '📍'}
              </span>
              <span className="geocoding-search__result-name">
                {r.display_name.split(',').slice(0, 2).join(',')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
