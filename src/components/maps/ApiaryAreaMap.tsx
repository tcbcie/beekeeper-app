'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

interface ApiaryAreaMapProps {
  lat: number
  lon: number
  radiusKm?: number
}

export default function ApiaryAreaMap({ lat, lon, radiusKm = 5 }: ApiaryAreaMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Create map
    const map = L.map(mapRef.current, {
      center: [lat, lon],
      zoom: 11,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false
    })

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map)

    // Draw circle (radius in meters)
    L.circle([lat, lon], {
      radius: radiusKm * 1000,
      color: '#d97706',
      fillColor: '#fbbf24',
      fillOpacity: 0.2,
      weight: 2
    }).addTo(map)

    // Fit bounds to circle
    const bounds = L.latLng(lat, lon).toBounds(radiusKm * 1000 * 2)
    map.fitBounds(bounds, { padding: [20, 20] })

    mapInstanceRef.current = map

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [lat, lon, radiusKm])

  return <div ref={mapRef} className="w-full h-full" />
}
