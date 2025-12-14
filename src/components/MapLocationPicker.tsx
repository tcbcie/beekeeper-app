'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MapPin, Crosshair, X, Circle } from 'lucide-react'

// Default center (Ireland)
const DEFAULT_CENTER: [number, number] = [-8.2439, 53.4129]

// Flight radius options in km
const FLIGHT_RADIUS_OPTIONS = [
  { value: 0, label: 'No radius' },
  { value: 1, label: '1 km' },
  { value: 2, label: '2 km' },
  { value: 2.5, label: '2.5 km' },
  { value: 3, label: '3 km' },
  { value: 3.5, label: '3.5 km' },
  { value: 5, label: '5 km' },
  { value: 6, label: '6 km' },
  { value: 7, label: '7 km' },
  { value: 8, label: '8 km' },
]

// Generate circle coordinates for GeoJSON
function createCircleGeoJSON(center: [number, number], radiusKm: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const points = 64
  const coords: [number, number][] = []
  const earthRadiusKm = 6371

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI
    const latOffset = (radiusKm / earthRadiusKm) * (180 / Math.PI) * Math.cos(angle)
    const lngOffset = (radiusKm / earthRadiusKm) * (180 / Math.PI) * Math.sin(angle) / Math.cos(center[1] * Math.PI / 180)
    coords.push([center[0] + lngOffset, center[1] + latOffset])
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [coords]
    }
  }
}

// Generate multi-polygon GeoJSON for all apiaries
function createMultiCircleGeoJSON(apiaries: ApiaryLocation[], radiusKm: number): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const features = apiaries
    .filter(a => a.latitude !== null && a.longitude !== null)
    .map(apiary => createCircleGeoJSON([apiary.longitude!, apiary.latitude!], radiusKm))

  return {
    type: 'FeatureCollection',
    features
  }
}

// Interface for apiary locations to display on map
interface ApiaryLocation {
  id: string
  name: string
  latitude: number | null
  longitude: number | null
}

interface MapLocationPickerProps {
  latitude: string
  longitude: string
  onLocationChange: (lat: string, lng: string) => void
  onCityChange?: (city: string) => void
  onClose?: () => void
  existingApiaries?: ApiaryLocation[]  // Other apiaries to show on map
  editingApiaryId?: string  // ID of apiary being edited (to exclude from existing)
}

export default function MapLocationPicker({
  latitude,
  longitude,
  onLocationChange,
  onCityChange,
  onClose,
  existingApiaries = [],
  editingApiaryId,
}: MapLocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const marker = useRef<mapboxgl.Marker | null>(null)
  const existingMarkers = useRef<mapboxgl.Marker[]>([])
  const [isLocating, setIsLocating] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [flightRadius, setFlightRadius] = useState(3) // Default 3km flight radius

  // Filter out the apiary being edited from existing apiaries
  const otherApiaries = existingApiaries.filter(a => a.id !== editingApiaryId && a.latitude && a.longitude)

  // Store callbacks in refs to avoid stale closures
  const onLocationChangeRef = useRef(onLocationChange)
  const onCityChangeRef = useRef(onCityChange)

  useEffect(() => {
    onLocationChangeRef.current = onLocationChange
    onCityChangeRef.current = onCityChange
  }, [onLocationChange, onCityChange])

  // Reverse geocode to get city name
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    if (!onCityChangeRef.current) return

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
          onCityChangeRef.current(place.text)
        }
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error)
    }
  }, [])

  // Store flightRadius in ref for use in callbacks
  const flightRadiusRef = useRef(flightRadius)
  useEffect(() => {
    flightRadiusRef.current = flightRadius
  }, [flightRadius])

  // Update marker position
  const updateMarkerPosition = useCallback((lng: number, lat: number) => {
    if (marker.current) {
      marker.current.setLngLat([lng, lat])
    }
    onLocationChangeRef.current(lat.toFixed(7), lng.toFixed(7))
    reverseGeocode(lat, lng)

    // Update circle position
    if (map.current) {
      const source = map.current.getSource('flight-radius') as mapboxgl.GeoJSONSource
      if (source && flightRadiusRef.current > 0) {
        source.setData(createCircleGeoJSON([lng, lat], flightRadiusRef.current))
      }
    }
  }, [reverseGeocode])

  // Initialize map - only runs once on mount
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
    if (!accessToken) {
      console.error('Mapbox access token is not configured')
      return
    }

    mapboxgl.accessToken = accessToken

    // Get initial center from current props
    const lat = parseFloat(latitude)
    const lng = parseFloat(longitude)
    const initialCenter: [number, number] = (!isNaN(lat) && !isNaN(lng)) ? [lng, lat] : DEFAULT_CENTER
    const hasExistingLocation = !isNaN(lat) && !isNaN(lng)

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

    // Handle marker drag - use refs for callbacks
    marker.current.on('dragend', () => {
      if (marker.current) {
        const lngLat = marker.current.getLngLat()
        onLocationChangeRef.current(lngLat.lat.toFixed(7), lngLat.lng.toFixed(7))
        reverseGeocode(lngLat.lat, lngLat.lng)
      }
    })

    // Handle map click
    map.current.on('click', (e) => {
      updateMarkerPosition(e.lngLat.lng, e.lngLat.lat)
    })

    map.current.on('load', () => {
      if (!map.current) return

      // Add existing apiaries circles (shown in orange/amber)
      if (otherApiaries.length > 0) {
        map.current.addSource('existing-apiaries-radius', {
          type: 'geojson',
          data: createMultiCircleGeoJSON(otherApiaries, 3) // Default 3km
        })

        map.current.addLayer({
          id: 'existing-apiaries-radius-fill',
          type: 'fill',
          source: 'existing-apiaries-radius',
          paint: {
            'fill-color': '#f59e0b', // Amber color for existing
            'fill-opacity': 0.12
          }
        })

        map.current.addLayer({
          id: 'existing-apiaries-radius-outline',
          type: 'line',
          source: 'existing-apiaries-radius',
          paint: {
            'line-color': '#f59e0b',
            'line-width': 2,
            'line-opacity': 0.5
          }
        })

        // Add markers for existing apiaries
        otherApiaries.forEach(apiary => {
          if (apiary.latitude && apiary.longitude && map.current) {
            const el = document.createElement('div')
            el.className = 'existing-apiary-marker'
            el.innerHTML = `<div style="background-color: #f59e0b; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
            </div>`
            el.title = apiary.name

            const marker = new mapboxgl.Marker({ element: el })
              .setLngLat([apiary.longitude, apiary.latitude])
              .addTo(map.current)

            existingMarkers.current.push(marker)
          }
        })
      }

      // Add current/new apiary flight radius circle (shown in red)
      map.current.addSource('flight-radius', {
        type: 'geojson',
        data: createCircleGeoJSON(initialCenter, 3) // Default 3km
      })

      map.current.addLayer({
        id: 'flight-radius-fill',
        type: 'fill',
        source: 'flight-radius',
        paint: {
          'fill-color': '#ef4444',
          'fill-opacity': 0.15
        }
      })

      map.current.addLayer({
        id: 'flight-radius-outline',
        type: 'line',
        source: 'flight-radius',
        paint: {
          'line-color': '#ef4444',
          'line-width': 2,
          'line-opacity': 0.6
        }
      })

      setMapLoaded(true)
    })

    return () => {
      // Clean up existing markers
      existingMarkers.current.forEach(m => m.remove())
      existingMarkers.current = []

      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Intentionally empty - only run on mount

  // Update circle when radius or coordinates change
  const updateCircle = useCallback((lng: number, lat: number, radiusKm: number) => {
    if (!map.current || !mapLoaded) return

    // Update current apiary circle
    const source = map.current.getSource('flight-radius') as mapboxgl.GeoJSONSource
    if (source) {
      if (radiusKm === 0) {
        // Hide circle by setting empty geometry
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [[]] }
        })
      } else {
        source.setData(createCircleGeoJSON([lng, lat], radiusKm))
      }
    }

    // Update existing apiaries circles with new radius
    const existingSource = map.current.getSource('existing-apiaries-radius') as mapboxgl.GeoJSONSource
    if (existingSource && otherApiaries.length > 0) {
      if (radiusKm === 0) {
        existingSource.setData({
          type: 'FeatureCollection',
          features: []
        })
      } else {
        existingSource.setData(createMultiCircleGeoJSON(otherApiaries, radiusKm))
      }
    }
  }, [mapLoaded, otherApiaries])

  // Update marker and circle when coordinates change externally
  useEffect(() => {
    if (!mapLoaded || !marker.current || !map.current) return

    const lat = parseFloat(latitude)
    const lng = parseFloat(longitude)

    if (!isNaN(lat) && !isNaN(lng)) {
      marker.current.setLngLat([lng, lat])
      map.current.flyTo({ center: [lng, lat], zoom: 14 })
      updateCircle(lng, lat, flightRadius)
    }
  }, [latitude, longitude, mapLoaded, flightRadius, updateCircle])

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

        {/* Flight radius dropdown */}
        <div className="absolute top-4 left-4 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-border">
          <div className="flex items-center gap-2 px-3 py-2">
            <Circle size={16} className="text-red-500" />
            <select
              value={flightRadius}
              onChange={(e) => {
                const newRadius = parseFloat(e.target.value)
                setFlightRadius(newRadius)
                const lat = parseFloat(latitude)
                const lng = parseFloat(longitude)
                if (!isNaN(lat) && !isNaN(lng)) {
                  updateCircle(lng, lat, newRadius)
                }
              }}
              className="bg-transparent text-sm text-foreground border-none focus:ring-0 cursor-pointer pr-6"
            >
              {FLIGHT_RADIUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

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
