'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { createCircleGeoJSON } from '@/lib/geo-circle'

interface ApiaryAreaMapProps {
  lat: number
  lon: number
  radiusKm?: number
}

// The source apiary's foraging area on the public trace page: a still map (no panning or zooming)
// with the amber circle. Drawn with Mapbox like the rest of the app; OpenStreetMap's own tile
// servers are not for apps. The position is already blurred before it reaches this page.
export default function ApiaryAreaMap({ lat, lon, radiusKm = 5 }: ApiaryAreaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
    // No token: the grey block from the wrapper stays, with its label.
    if (!containerRef.current || !accessToken) return
    mapboxgl.accessToken = accessToken

    const circle = createCircleGeoJSON([lon, lat], radiusKm)
    const ring = circle.geometry.coordinates[0]
    const lngs = ring.map(point => point[0])
    const lats = ring.map(point => point[1])

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      bounds: [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      fitBoundsOptions: { padding: 20 },
      interactive: false,
    })

    map.on('load', () => {
      map.addSource('foraging-area', { type: 'geojson', data: circle })
      map.addLayer({
        id: 'foraging-area-fill',
        type: 'fill',
        source: 'foraging-area',
        paint: { 'fill-color': '#fbbf24', 'fill-opacity': 0.2 },
      })
      map.addLayer({
        id: 'foraging-area-line',
        type: 'line',
        source: 'foraging-area',
        paint: { 'line-color': '#d97706', 'line-width': 2 },
      })
    })

    return () => map.remove()
  }, [lat, lon, radiusKm])

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Map of the approximate area around the source apiary"
      className="w-full h-full"
    />
  )
}
