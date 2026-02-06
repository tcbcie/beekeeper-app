'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MapPin, Crosshair, X, Circle, Layers, Map, Satellite, Maximize2, Minimize2 } from 'lucide-react'

// Default center (Ireland)
const DEFAULT_CENTER: [number, number] = [-8.2439, 53.4129]

// LocalStorage key for flight radius preference
const FLIGHT_RADIUS_STORAGE_KEY = 'hivecraic-map-flight-radius'

// Get saved flight radius from localStorage
function getSavedFlightRadius(): number {
  if (typeof window === 'undefined') return 3
  const saved = localStorage.getItem(FLIGHT_RADIUS_STORAGE_KEY)
  if (saved) {
    const parsed = parseFloat(saved)
    if (!isNaN(parsed)) return parsed
  }
  return 3 // Default 3km
}

// Save flight radius to localStorage
function saveFlightRadius(radius: number): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(FLIGHT_RADIUS_STORAGE_KEY, radius.toString())
}

// Calculate center point from multiple apiaries
function calculateCenterOfApiaries(apiaries: ApiaryLocation[]): [number, number] | null {
  const validApiaries = apiaries.filter(a => a.latitude !== null && a.longitude !== null)
  if (validApiaries.length === 0) return null

  const sumLat = validApiaries.reduce((sum, a) => sum + a.latitude!, 0)
  const sumLng = validApiaries.reduce((sum, a) => sum + a.longitude!, 0)

  return [sumLng / validApiaries.length, sumLat / validApiaries.length]
}

// Map style options
const MAP_STYLES = {
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  terrain: 'mapbox://styles/mapbox/satellite-v9',
} as const

type MapStyleKey = keyof typeof MAP_STYLES

// Calculate distance between two points using Haversine formula
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Calculate overlap between two circles (approximation using distance)
// Returns percentage of overlap (0-100) based on how much the circles overlap
function calculateCircleOverlap(
  center1: [number, number],
  center2: [number, number],
  radius1Km: number,
  radius2Km: number
): number {
  const distance = haversineDistance(center1[1], center1[0], center2[1], center2[0])
  const sumRadii = radius1Km + radius2Km

  // No overlap if distance > sum of radii
  if (distance >= sumRadii) return 0

  // Complete overlap if one circle contains the other
  if (distance <= Math.abs(radius1Km - radius2Km)) {
    const smallerRadius = Math.min(radius1Km, radius2Km)
    const largerRadius = Math.max(radius1Km, radius2Km)
    return (smallerRadius / largerRadius) * 100
  }

  // Partial overlap - use lens area formula approximation
  // Area of intersection of two circles
  const r1 = radius1Km
  const r2 = radius2Km
  const d = distance

  const part1 = r1 * r1 * Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1))
  const part2 = r2 * r2 * Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2))
  const part3 = 0.5 * Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2))

  const intersectionArea = part1 + part2 - part3
  const smallerCircleArea = Math.PI * Math.min(r1, r2) * Math.min(r1, r2)

  // Return percentage of smaller circle that is overlapped
  return Math.min(100, (intersectionArea / smallerCircleArea) * 100)
}

// Calculate total overlap percentage with all existing apiaries
function calculateTotalOverlap(
  newCenter: [number, number],
  newRadius: number,
  existingApiaries: ApiaryLocation[],
  existingRadius: number
): { totalOverlap: number; overlappingApiaries: string[] } {
  if (newRadius === 0 || existingRadius === 0) {
    return { totalOverlap: 0, overlappingApiaries: [] }
  }

  const overlappingApiaries: string[] = []
  let maxOverlap = 0

  existingApiaries.forEach(apiary => {
    if (apiary.latitude && apiary.longitude) {
      const overlap = calculateCircleOverlap(
        newCenter,
        [apiary.longitude, apiary.latitude],
        newRadius,
        existingRadius
      )
      if (overlap > 0) {
        overlappingApiaries.push(apiary.name)
        maxOverlap = Math.max(maxOverlap, overlap)
      }
    }
  })

  return { totalOverlap: Math.round(maxOverlap), overlappingApiaries }
}

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
  const [flightRadius, setFlightRadius] = useState(() => getSavedFlightRadius())
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('outdoors')
  const [overlapInfo, setOverlapInfo] = useState<{ totalOverlap: number; overlappingApiaries: string[] }>({ totalOverlap: 0, overlappingApiaries: [] })
  const [isFullscreen, setIsFullscreen] = useState(false)

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

  // Update overlap layer on the map
  const updateOverlapLayer = useCallback((lng: number, lat: number, radiusKm: number) => {
    if (!map.current || !mapLoaded || radiusKm === 0) return

    // Create overlap polygons where circles intersect
    const overlapFeatures: GeoJSON.Feature<GeoJSON.Polygon>[] = []

    otherApiaries.forEach(apiary => {
      if (apiary.latitude && apiary.longitude) {
        const distance = haversineDistance(lat, lng, apiary.latitude, apiary.longitude)
        const sumRadii = radiusKm * 2 // Both circles have same radius

        // If circles overlap, create a highlight
        if (distance < sumRadii && distance > 0) {
          // Create a smaller circle at the midpoint for visual overlap indication
          const midLng = (lng + apiary.longitude) / 2
          const midLat = (lat + apiary.latitude) / 2
          const overlapRadius = Math.max(0.5, (sumRadii - distance) / 2)
          overlapFeatures.push(createCircleGeoJSON([midLng, midLat], overlapRadius))
        }
      }
    })

    const overlapSource = map.current.getSource('overlap-zones') as mapboxgl.GeoJSONSource
    if (overlapSource) {
      overlapSource.setData({
        type: 'FeatureCollection',
        features: overlapFeatures
      })
    }
  }, [mapLoaded, otherApiaries])

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

      // Calculate and update overlap
      const overlap = calculateTotalOverlap([lng, lat], flightRadiusRef.current, otherApiaries, flightRadiusRef.current)
      setOverlapInfo(overlap)

      // Update overlap visualization
      updateOverlapLayer(lng, lat, flightRadiusRef.current)
    }
  }, [reverseGeocode, otherApiaries, updateOverlapLayer])

  // Initialize map - only runs once on mount
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
    if (!accessToken) {
      console.error('Mapbox access token is not configured')
      return
    }

    mapboxgl.accessToken = accessToken

    // Get initial center from current props, or center on existing apiaries
    const lat = parseFloat(latitude)
    const lng = parseFloat(longitude)
    const hasExistingLocation = !isNaN(lat) && !isNaN(lng)

    let initialCenter: [number, number]
    let initialZoom: number

    if (hasExistingLocation) {
      // Use current apiary location
      initialCenter = [lng, lat]
      initialZoom = 14
    } else if (otherApiaries.length > 0) {
      // Center on existing apiaries
      const apiaryCenter = calculateCenterOfApiaries(otherApiaries)
      initialCenter = apiaryCenter || DEFAULT_CENTER
      initialZoom = otherApiaries.length === 1 ? 12 : 10
    } else {
      // Default to Ireland
      initialCenter = DEFAULT_CENTER
      initialZoom = 6
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: initialCenter,
      zoom: initialZoom,
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

      // Get saved radius for initial display
      const savedRadius = getSavedFlightRadius()

      // Add existing apiaries circles (shown in orange/amber)
      if (otherApiaries.length > 0) {
        map.current.addSource('existing-apiaries-radius', {
          type: 'geojson',
          data: createMultiCircleGeoJSON(otherApiaries, savedRadius)
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

        // Add markers for existing apiaries with popups
        otherApiaries.forEach(apiary => {
          if (apiary.latitude && apiary.longitude && map.current) {
            const el = document.createElement('div')
            el.className = 'existing-apiary-marker'
            el.innerHTML = `<div style="background-color: #f59e0b; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
            </div>`

            // Create popup with apiary name
            const popup = new mapboxgl.Popup({
              offset: 25,
              closeButton: false,
              closeOnClick: true,
              className: 'apiary-popup'
            }).setHTML(`<div style="font-weight: 600; padding: 4px 8px;">${apiary.name}</div>`)

            const existingMarker = new mapboxgl.Marker({ element: el })
              .setLngLat([apiary.longitude, apiary.latitude])
              .setPopup(popup)
              .addTo(map.current)

            existingMarkers.current.push(existingMarker)
          }
        })
      }

      // Add current/new apiary flight radius circle (shown in red)
      map.current.addSource('flight-radius', {
        type: 'geojson',
        data: createCircleGeoJSON(initialCenter, savedRadius)
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

      // Add overlap zones layer (purple for competition areas)
      map.current.addSource('overlap-zones', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      })

      map.current.addLayer({
        id: 'overlap-zones-fill',
        type: 'fill',
        source: 'overlap-zones',
        paint: {
          'fill-color': '#9333ea', // Purple for overlap
          'fill-opacity': 0.35
        }
      })

      map.current.addLayer({
        id: 'overlap-zones-outline',
        type: 'line',
        source: 'overlap-zones',
        paint: {
          'line-color': '#7c3aed',
          'line-width': 2,
          'line-opacity': 0.8
        }
      })

      // Calculate initial overlap if position is set
      if (hasExistingLocation) {
        const overlap = calculateTotalOverlap([lng, lat], savedRadius, otherApiaries, savedRadius)
        setOverlapInfo(overlap)
      }

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

  // Handle fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev)
    // Resize map after state change
    setTimeout(() => {
      if (map.current) {
        map.current.resize()
      }
    }, 100)
  }, [])

  // Handle Escape key to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false)
        setTimeout(() => {
          if (map.current) {
            map.current.resize()
          }
        }, 100)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFullscreen])

  // Handle map style change
  const handleStyleChange = (newStyle: MapStyleKey) => {
    if (!map.current) return

    setMapStyle(newStyle)
    map.current.setStyle(MAP_STYLES[newStyle])

    // Re-add layers after style change
    map.current.once('style.load', () => {
      if (!map.current) return

      const savedRadius = getSavedFlightRadius()
      const lat = parseFloat(latitude)
      const lng = parseFloat(longitude)
      const currentCenter: [number, number] = (!isNaN(lat) && !isNaN(lng)) ? [lng, lat] : DEFAULT_CENTER

      // Re-add existing apiaries circles
      if (otherApiaries.length > 0) {
        map.current.addSource('existing-apiaries-radius', {
          type: 'geojson',
          data: createMultiCircleGeoJSON(otherApiaries, savedRadius)
        })

        map.current.addLayer({
          id: 'existing-apiaries-radius-fill',
          type: 'fill',
          source: 'existing-apiaries-radius',
          paint: {
            'fill-color': '#f59e0b',
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
      }

      // Re-add current apiary circle
      map.current.addSource('flight-radius', {
        type: 'geojson',
        data: createCircleGeoJSON(currentCenter, savedRadius)
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

      // Re-add overlap zones
      map.current.addSource('overlap-zones', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      })

      map.current.addLayer({
        id: 'overlap-zones-fill',
        type: 'fill',
        source: 'overlap-zones',
        paint: {
          'fill-color': '#9333ea',
          'fill-opacity': 0.35
        }
      })

      map.current.addLayer({
        id: 'overlap-zones-outline',
        type: 'line',
        source: 'overlap-zones',
        paint: {
          'line-color': '#7c3aed',
          'line-width': 2,
          'line-opacity': 0.8
        }
      })

      // Recalculate overlap
      if (!isNaN(lat) && !isNaN(lng)) {
        updateOverlapLayer(lng, lat, savedRadius)
      }
    })
  }

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-slate-900 p-4' : ''}`}>
      {/* Header with instructions */}
      <div className={`flex items-center justify-between ${isFullscreen ? 'mb-4' : 'mb-2'}`}>
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <MapPin size={16} className="text-forest-600" />
          <span>Click on the map or drag the marker to set location</span>
        </div>
        <div className="flex items-center gap-2">
          {isFullscreen && (
            <>
              <span className="text-xs text-text-tertiary hidden sm:inline">Press Esc to exit</span>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                title="Exit fullscreen"
              >
                <X size={20} />
              </button>
            </>
          )}
          {onClose && !isFullscreen && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-text-tertiary hover:text-foreground rounded"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Map container */}
      <div className={`relative rounded-lg overflow-hidden border border-border ${isFullscreen ? 'h-[calc(100vh-120px)]' : ''}`}>
        <div ref={mapContainer} className={`w-full ${isFullscreen ? 'h-full' : 'h-[300px] md:h-[400px]'}`} />

        {/* Flight radius dropdown */}
        <div className="absolute top-4 left-4 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-border">
          <div className="flex items-center gap-2 px-3 py-2">
            <Circle size={16} className="text-red-500" />
            <select
              value={flightRadius}
              onChange={(e) => {
                const newRadius = parseFloat(e.target.value)
                setFlightRadius(newRadius)
                saveFlightRadius(newRadius) // Save preference
                const lat = parseFloat(latitude)
                const lng = parseFloat(longitude)
                if (!isNaN(lat) && !isNaN(lng)) {
                  updateCircle(lng, lat, newRadius)
                  // Update overlap calculation
                  const overlap = calculateTotalOverlap([lng, lat], newRadius, otherApiaries, newRadius)
                  setOverlapInfo(overlap)
                  updateOverlapLayer(lng, lat, newRadius)
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

        {/* Map style toggle */}
        <div className="absolute top-4 right-14 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-border flex">
          <button
            type="button"
            onClick={() => handleStyleChange('outdoors')}
            className={`p-2 rounded-l-lg transition-colors ${mapStyle === 'outdoors' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800' : 'hover:bg-gray-100 dark:hover:bg-slate-700'}`}
            title="Outdoors map"
          >
            <Map size={18} />
          </button>
          <button
            type="button"
            onClick={() => handleStyleChange('satellite')}
            className={`p-2 rounded-r-lg transition-colors ${mapStyle === 'satellite' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800' : 'hover:bg-gray-100 dark:hover:bg-slate-700'}`}
            title="Satellite view"
          >
            <Satellite size={18} />
          </button>
        </div>

        {/* Overlap warning indicator */}
        {overlapInfo.totalOverlap > 0 && (
          <div className="absolute top-16 left-4 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-border px-3 py-2 max-w-[200px]">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <Layers size={16} />
              <span className="text-sm font-medium">{overlapInfo.totalOverlap}% overlap</span>
            </div>
            {overlapInfo.overlappingApiaries.length > 0 && (
              <p className="text-xs text-text-tertiary mt-1 truncate" title={overlapInfo.overlappingApiaries.join(', ')}>
                with: {overlapInfo.overlappingApiaries.slice(0, 2).join(', ')}
                {overlapInfo.overlappingApiaries.length > 2 && ` +${overlapInfo.overlappingApiaries.length - 2}`}
              </p>
            )}
          </div>
        )}

        {/* Bottom controls */}
        <div className="absolute bottom-4 right-4 flex gap-2">
          {/* Fullscreen toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors border border-border"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 size={20} className="text-text-secondary" />
            ) : (
              <Maximize2 size={20} className="text-text-secondary" />
            )}
          </button>

          {/* Current location button */}
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
            className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors border border-border"
            title="Use my current location"
          >
            <Crosshair
              size={20}
              className={`text-forest-600 ${isLocating ? 'animate-pulse' : ''}`}
            />
          </button>
        </div>
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
