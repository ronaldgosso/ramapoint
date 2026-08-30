import { useState, useEffect } from 'react'
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

/**
 * Shows a pulsing dot at the user's live GPS position.
 * Uses watchPosition so the marker updates as the user moves.
 */
export default function UserLocationMarker() {
  const [position, setPosition] = useState(null)

  useEffect(() => {
    if (!navigator.geolocation) return

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude])
      },
      (err) => {
        console.warn('Could not watch user location:', err)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  if (!position) return null

  const userIcon = L.divIcon({
    html: '<div class="user-location-pulse"></div>',
    className: 'user-location-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })

  return (
    <Marker position={position} icon={userIcon}>
      <Popup>
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-ui)', fontSize: '12px' }}>
          <strong>You are here</strong>
          <div style={{ opacity: 0.7, marginTop: '2px' }}>
            {position[0].toFixed(5)}, {position[1].toFixed(5)}
          </div>
        </div>
      </Popup>
    </Marker>
  )
}
