'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MapPin, Crosshair, X } from 'lucide-react'

interface MapLocationPickerProps {
  latitude: string
  longitude: string
  onLocationChange: (lat: string, lng: string) => void
  onCityChange?: (city: string) => void
  onClose?: () => void
}

export default function MapLocationPicker({
  latitude,
  longitude,
  onLocationChange,
  onCityChange,
  onClose,
}: MapLocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const marker = useRef<mapboxgl.Marker | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Default center (Ireland)
  const defaultCenter: [number, number] = [-8.2439, 53.4129]

  // Get initial coordinates or default
  const getInitialCenter = useCallback((): [number, number] => {
    const lat = parseFloat(latitude)
    const lng = parseFloat(longitude)
    if (!isNaN(lat) && !isNaN(lng)) {
      return [lng, lat]
    }
    return defaultCenter
  }, [latitude, longitude])

  // Reverse geocode to get city name
  const reverseGeocode = async (lat: number, lng: number) => {
    if (!onCityChange) return

    try {
      const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
      if (!accessToken) return

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place,locality&access_token=${accessToken}`
      )
      const data = await response.json()

      if (data.features && data.features.length > 0) {
        // Get the first place/locality feature
        const place = data.features.find(
          (f: { place_type: string[] }) =>
            f.place_type.includes('place') || f.place_type.includes('locality')
        )
        if (place) {
          onCityChange(place.text)
        }
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error)
    }
  }

  // Update marker position
  const updateMarkerPosition = useCallback((lng: number, lat: number) => {
    if (marker.current) {
      marker.current.setLngLat([lng, lat])
    }
    onLocationChange(lat.toFixed(7), lng.toFixed(7))
    reverseGeocode(lat, lng)
  }, [onLocationChange])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
    if (!accessToken) {
      console.error('Mapbox access token is not configured')
      return
    }

    mapboxgl.accessToken = accessToken

    const initialCenter = getInitialCenter()
    const hasExistingLocation = !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude))

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: initialCenter,
      zoom: hasExistingLocation ? 14 : 6,
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    // Create draggable marker
    marker.current = new mapboxgl.Marker({
      draggable: true,
      color: '#16a34a', // Green color to match app theme
    })
      .setLngLat(initialCenter)
      .addTo(map.current)

    // Handle marker drag
    marker.current.on('dragend', () => {
      if (marker.current) {
        const lngLat = marker.current.getLngLat()
        onLocationChange(lngLat.lat.toFixed(7), lngLat.lng.toFixed(7))
        reverseGeocode(lngLat.lat, lngLat.lng)
      }
    })

    // Handle map click
    map.current.on('click', (e) => {
      updateMarkerPosition(e.lngLat.lng, e.lngLat.lat)
    })

    map.current.on('load', () => {
      setMapLoaded(true)
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Update marker when coordinates change externally
  useEffect(() => {
    if (!mapLoaded || !marker.current || !map.current) return

    const lat = parseFloat(latitude)
    const lng = parseFloat(longitude)

    if (!isNaN(lat) && !isNaN(lng)) {
      marker.current.setLngLat([lng, lat])
      map.current.flyTo({ center: [lng, lat], zoom: 14 })
    }
  }, [latitude, longitude, mapLoaded])

  // Get user's current location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords
        updateMarkerPosition(lng, lat)
        if (map.current) {
          map.current.flyTo({ center: [lng, lat], zoom: 14 })
        }
        setIsLocating(false)
      },
      (error) => {
        console.error('Geolocation error:', error)
        alert('Unable to get your location. Please enable location services.')
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="relative">
      {/* Header with instructions */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <MapPin size={16} className="text-forest-600" />
          <span>Click on the map or drag the marker to set location</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-text-tertiary hover:text-foreground rounded"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Map container */}
      <div className="relative rounded-lg overflow-hidden border border-border">
        <div ref={mapContainer} className="w-full h-[300px] md:h-[400px]" />

        {/* Current location button */}
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={isLocating}
          className="absolute bottom-4 right-4 bg-white dark:bg-slate-800 p-2 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors border border-border"
          title="Use my current location"
        >
          <Crosshair
            size={20}
            className={`text-forest-600 ${isLocating ? 'animate-pulse' : ''}`}
          />
        </button>
      </div>

      {/* Coordinates display */}
      <div className="mt-2 flex items-center gap-4 text-xs text-text-tertiary">
        <span>
          Lat: <span className="font-mono text-text-secondary">{latitude || '—'}</span>
        </span>
        <span>
          Lng: <span className="font-mono text-text-secondary">{longitude || '—'}</span>
        </span>
      </div>
    </div>
  )
}
