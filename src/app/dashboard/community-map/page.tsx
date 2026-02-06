'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId, isPowerUserOrAdmin } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { MapPin, Info, Map, Satellite, Users, Maximize2, Minimize2, Eye, EyeOff, Circle, Mountain, X, Flame, Calendar, TreeDeciduous } from 'lucide-react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
// Server-side obfuscation now used - coordinates pre-obfuscated in database views

interface SharedApiary {
  id: string
  city: string | null
  latitude: number
  longitude: number
  created_at: string
  hive_count: number
}

interface UserApiary {
  id: string
  name: string
  city: string | null
  latitude: number
  longitude: number
  created_at: string
}

interface WildColony {
  id: string
  latitude: number
  longitude: number
  status: string
  nesting_type: string | null
  observation_date: string
}

// Default center (Ireland)
const DEFAULT_CENTER: [number, number] = [-8.2439, 53.4129]

// Map style options
const MAP_STYLES = {
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  terrain: 'mapbox://styles/mapbox/satellite-v9', // Terrain uses satellite with 3D elevation
} as const

type MapStyleKey = keyof typeof MAP_STYLES

// Flight radius options
const FLIGHT_RADIUS_OPTIONS = [
  { value: 0, label: 'No radius' },
  { value: 2, label: '2 km' },
  { value: 3, label: '3 km' },
  { value: 5, label: '5 km' },
]

// Haversine formula to calculate distance between two points
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

// Create multi-circle GeoJSON for multiple apiaries
function createMultiCircleGeoJSON(
  apiaries: Array<{ latitude: number; longitude: number }>,
  radiusKm: number
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const features = apiaries.map(apiary =>
    createCircleGeoJSON([apiary.longitude, apiary.latitude], radiusKm)
  )
  return {
    type: 'FeatureCollection',
    features
  }
}

// Time filter options
const TIME_FILTER_OPTIONS = [
  { value: 0, label: 'All time' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
  { value: 365, label: 'Last year' },
]

export default function CommunityMapPage() {
  const [loading, setLoading] = useState(true)
  const [sharedApiaries, setSharedApiaries] = useState<SharedApiary[]>([])
  const [userApiaries, setUserApiaries] = useState<UserApiary[]>([])
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('outdoors')
  const [mapLoaded, setMapLoaded] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showUserApiaries, setShowUserApiaries] = useState(true)
  const [showSharedApiaries, setShowSharedApiaries] = useState(true)
  const [flightRadius, setFlightRadius] = useState(3) // Default 3km
  const [showHeatMap, setShowHeatMap] = useState(false)
  const [timeFilter, setTimeFilter] = useState(0) // Days, 0 = all time
  const [wildColonies, setWildColonies] = useState<WildColony[]>([])
  const [showWildColonies, setShowWildColonies] = useState(true)
  const [isPowerUser, setIsPowerUser] = useState(false)
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markers = useRef<mapboxgl.Marker[]>([])
  const router = useRouter()

  // Check auth and fetch shared apiaries
  useEffect(() => {
    const init = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }

      // Fetch shared apiaries (excluding user's own) from obfuscated view
      // Coordinates are already obfuscated server-side for privacy
      const { data: sharedData, error: sharedError } = await supabase
        .from('shared_apiaries_obfuscated')
        .select('id, city, latitude, longitude, created_at, hive_count')
        .neq('user_id', id)

      if (!sharedError && sharedData) {
        setSharedApiaries(sharedData)
      }

      // Fetch user's own apiaries with coordinates
      const { data: userData, error: userError } = await supabase
        .from('apiaries')
        .select('id, name, city, latitude, longitude, created_at')
        .eq('user_id', id)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)

      if (!userError && userData) {
        setUserApiaries(userData)
      }

      // Check if user is Power User/Admin and fetch wild colonies
      const powerUser = await isPowerUserOrAdmin()
      setIsPowerUser(powerUser)

      if (powerUser) {
        // Fetch wild colonies from obfuscated view
        // Coordinates are already obfuscated server-side for privacy
        const { data: wildData, error: wildError } = await supabase
          .from('wild_colonies_obfuscated')
          .select('id, latitude, longitude, status, nesting_type, observation_date')

        if (!wildError && wildData) {
          setWildColonies(wildData)
        }
      }

      setLoading(false)
    }

    init()
  }, [router])

  // Initialize map
  useEffect(() => {
    if (loading || !mapContainer.current || map.current) return

    const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
    if (!accessToken) {
      console.error('Mapbox access token is not configured')
      return
    }

    mapboxgl.accessToken = accessToken

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_STYLES.outdoors,
      center: DEFAULT_CENTER,
      zoom: 6,
    })

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    map.current.on('load', () => {
      setMapLoaded(true)
    })

    return () => {
      markers.current.forEach(m => m.remove())
      markers.current = []
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [loading])

  // Calculate distance to nearest user apiary
  const calculateNearestDistance = useCallback((lat: number, lng: number): number | undefined => {
    if (userApiaries.length === 0) return undefined
    let minDistance = Infinity
    userApiaries.forEach(apiary => {
      const distance = haversineDistance(lat, lng, apiary.latitude, apiary.longitude)
      if (distance < minDistance) minDistance = distance
    })
    return minDistance === Infinity ? undefined : Math.round(minDistance * 10) / 10
  }, [userApiaries])

  // Add markers for all apiaries
  useEffect(() => {
    if (!mapLoaded || !map.current) return

    // Clear existing markers
    markers.current.forEach(m => m.remove())
    markers.current = []

    // Remove existing layers
    const layersToRemove = [
      'user-flight-radius-fill', 'user-flight-radius-outline',
      'shared-flight-radius-fill', 'shared-flight-radius-outline',
      'heat-map-layer', 'cluster-circles', 'cluster-count', 'unclustered-point'
    ]
    const sourcesToRemove = [
      'user-flight-radius', 'shared-flight-radius', 'apiaries-geojson'
    ]
    layersToRemove.forEach(layer => {
      if (map.current?.getLayer(layer)) map.current.removeLayer(layer)
    })
    sourcesToRemove.forEach(source => {
      if (map.current?.getSource(source)) map.current.removeSource(source)
    })

    // Apply time filter
    const filterByTime = <T extends { created_at: string }>(apiaries: T[]): T[] => {
      if (timeFilter === 0) return apiaries
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - timeFilter)
      return apiaries.filter(a => new Date(a.created_at) >= cutoff)
    }

    const filteredUserApiaries = filterByTime(userApiaries)
    const filteredSharedApiaries = filterByTime(sharedApiaries)

    // Add flight radius circles for user apiaries (green)
    if (showUserApiaries && filteredUserApiaries.length > 0 && flightRadius > 0 && !showHeatMap) {
      map.current.addSource('user-flight-radius', {
        type: 'geojson',
        data: createMultiCircleGeoJSON(filteredUserApiaries, flightRadius)
      })
      map.current.addLayer({
        id: 'user-flight-radius-fill',
        type: 'fill',
        source: 'user-flight-radius',
        paint: {
          'fill-color': '#16a34a',
          'fill-opacity': 0.1
        }
      })
      map.current.addLayer({
        id: 'user-flight-radius-outline',
        type: 'line',
        source: 'user-flight-radius',
        paint: {
          'line-color': '#16a34a',
          'line-width': 2,
          'line-opacity': 0.4
        }
      })
    }

    // Shared apiaries already have obfuscated coordinates from server-side view
    // No client-side obfuscation needed - coordinates never leave server unobfuscated

    // Add flight radius circles for shared apiaries (purple)
    if (showSharedApiaries && filteredSharedApiaries.length > 0 && flightRadius > 0 && !showHeatMap) {
      map.current.addSource('shared-flight-radius', {
        type: 'geojson',
        data: createMultiCircleGeoJSON(filteredSharedApiaries, flightRadius)
      })
      map.current.addLayer({
        id: 'shared-flight-radius-fill',
        type: 'fill',
        source: 'shared-flight-radius',
        paint: {
          'fill-color': '#8b5cf6',
          'fill-opacity': 0.08
        }
      })
      map.current.addLayer({
        id: 'shared-flight-radius-outline',
        type: 'line',
        source: 'shared-flight-radius',
        paint: {
          'line-color': '#8b5cf6',
          'line-width': 1.5,
          'line-opacity': 0.3
        }
      })
    }

    // Combine all apiaries for heat map / clustering
    const allApiariesGeoJSON: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        ...(showUserApiaries ? filteredUserApiaries.map(a => ({
          type: 'Feature' as const,
          properties: { type: 'user', name: a.name, city: a.city },
          geometry: { type: 'Point' as const, coordinates: [a.longitude, a.latitude] }
        })) : []),
        ...(showSharedApiaries ? filteredSharedApiaries.map(a => ({
          type: 'Feature' as const,
          properties: { type: 'shared', city: a.city },
          geometry: { type: 'Point' as const, coordinates: [a.longitude, a.latitude] }
        })) : [])
      ]
    }

    // Heat map mode
    if (showHeatMap && allApiariesGeoJSON.features.length > 0) {
      map.current.addSource('apiaries-geojson', {
        type: 'geojson',
        data: allApiariesGeoJSON
      })

      map.current.addLayer({
        id: 'heat-map-layer',
        type: 'heatmap',
        source: 'apiaries-geojson',
        paint: {
          'heatmap-weight': 1,
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 0.3,
            10, 0.8,
            15, 1.2
          ],
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 5,
            8, 12,
            12, 25
          ],
          'heatmap-opacity': 0.65,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0, 0, 255, 0)',
            0.2, 'rgb(0, 255, 255)',
            0.4, 'rgb(0, 255, 0)',
            0.6, 'rgb(255, 255, 0)',
            0.8, 'rgb(255, 128, 0)',
            1, 'rgb(255, 0, 0)'
          ]
        }
      })
    } else {
      // Standard marker mode (no heat map)

      // Add markers for user's own apiaries (green, exact location)
      if (showUserApiaries) {
        filteredUserApiaries.forEach(apiary => {
          if (!map.current) return

          const el = document.createElement('div')
          el.className = 'user-apiary-marker'
          el.style.cursor = 'pointer'
          el.innerHTML = `<div style="background-color: #16a34a; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>`

          const popup = new mapboxgl.Popup({
            offset: 15,
            closeButton: false,
            closeOnClick: true,
          }).setHTML(`
            <div style="padding: 4px 8px;">
              <div style="font-weight: 600; color: #22c55e;">${apiary.name}</div>
              ${apiary.city ? `<div style="font-size: 12px; opacity: 0.7;">${apiary.city}</div>` : ''}
              <div style="font-size: 11px; color: #22c55e; margin-top: 4px;">Your apiary</div>
            </div>
          `)

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([apiary.longitude, apiary.latitude])
            .setPopup(popup)
            .addTo(map.current)

          markers.current.push(marker)
        })
      }

      // Add markers for shared apiaries (purple) - coordinates already obfuscated server-side
      if (showSharedApiaries) {
        filteredSharedApiaries.forEach((apiary) => {
          if (!map.current) return

          // Calculate distance to nearest user apiary
          const distance = calculateNearestDistance(apiary.latitude, apiary.longitude)
          const distanceText = distance !== undefined ? `<div style="font-size: 11px; color: #34d399; margin-top: 4px;">${distance} km from your nearest apiary</div>` : ''

          const el = document.createElement('div')
          el.className = 'community-apiary-marker'
          el.style.cursor = 'pointer'
          el.innerHTML = `<div style="background-color: #8b5cf6; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); opacity: 0.8;"></div>`

          const popup = new mapboxgl.Popup({
            offset: 15,
            closeButton: false,
            closeOnClick: true,
          }).setHTML(`
            <div style="padding: 4px 8px;">
              <div style="font-weight: 600; color: #a78bfa;">Shared Apiary</div>
              ${apiary.city ? `<div style="font-size: 12px; opacity: 0.7;">Near ${apiary.city}</div>` : ''}
              <div style="font-size: 11px; opacity: 0.7; margin-top: 2px;">${apiary.hive_count} ${apiary.hive_count === 1 ? 'hive' : 'hives'}</div>
              <div style="font-size: 11px; opacity: 0.6; margin-top: 4px;">~5km accuracy</div>
              ${distanceText}
            </div>
          `)

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([apiary.longitude, apiary.latitude])
            .setPopup(popup)
            .addTo(map.current)

          markers.current.push(marker)
        })
      }

      // Add markers for wild colonies (amber/orange) - Power Users only
      // Coordinates already obfuscated server-side
      if (isPowerUser && showWildColonies && wildColonies.length > 0) {
        wildColonies.forEach((colony) => {
          if (!map.current) return

          const nestingLabel = colony.nesting_type
            ? colony.nesting_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
            : 'Unknown'

          const el = document.createElement('div')
          el.className = 'wild-colony-marker'
          el.style.cursor = 'pointer'
          // Tree/hollow icon to distinguish from managed apiaries
          el.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; background-color: #f59e0b; width: 26px; height: 26px; border-radius: 6px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22v-7"></path>
              <path d="M12 8V2"></path>
              <path d="M12 8c-3 0-6 2-6 5s3 4 6 4 6-1 6-4-3-5-6-5z"></path>
              <circle cx="12" cy="5" r="3"></circle>
            </svg>
          </div>`

          const popup = new mapboxgl.Popup({
            offset: 15,
            closeButton: false,
            closeOnClick: true,
          }).setHTML(`
            <div style="padding: 4px 8px;">
              <div style="font-weight: 600; color: #f59e0b;">Wild Colony</div>
              <div style="font-size: 12px; opacity: 0.7;">${nestingLabel}</div>
              <div style="font-size: 11px; opacity: 0.7; margin-top: 2px;">Status: ${colony.status}</div>
              <div style="font-size: 11px; opacity: 0.6; margin-top: 4px;">~5km accuracy</div>
            </div>
          `)

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([colony.longitude, colony.latitude])
            .setPopup(popup)
            .addTo(map.current)

          markers.current.push(marker)
        })
      }
    }

    // Fit bounds to include visible apiaries (only on first load)
    const visibleUserApiaries = showUserApiaries ? filteredUserApiaries : []
    const visibleSharedApiaries = showSharedApiaries ? filteredSharedApiaries : []
    const allVisible = [...visibleUserApiaries, ...visibleSharedApiaries]

    if (allVisible.length > 0 && !markers.current.some(m => m.getPopup()?.isOpen())) {
      const bounds = new mapboxgl.LngLatBounds()
      allVisible.forEach(apiary => {
        bounds.extend([apiary.longitude, apiary.latitude])
      })
      // Only fit bounds initially, not on every filter change
    }
  }, [mapLoaded, sharedApiaries, userApiaries, showUserApiaries, showSharedApiaries, flightRadius, showHeatMap, timeFilter, calculateNearestDistance, isPowerUser, showWildColonies, wildColonies])

  // Handle style change
  const handleStyleChange = (newStyle: MapStyleKey) => {
    if (!map.current) return
    setMapStyle(newStyle)
    map.current.setStyle(MAP_STYLES[newStyle])

    // Enable/disable terrain based on style
    map.current.once('style.load', () => {
      if (!map.current) return
      if (newStyle === 'terrain') {
        map.current.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14
        })
        map.current.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })
      }
    })
  }

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev)
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
          if (map.current) map.current.resize()
        }, 100)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

  if (loading) return <LoadingSpinner text="Loading community map..." />

  // Fullscreen layout wrapper
  const mapContent = (
    <div className={`relative ${isFullscreen ? 'h-full' : ''}`}>
      <div ref={mapContainer} className={`w-full ${isFullscreen ? 'h-full' : 'h-[500px] md:h-[600px]'}`} />

      {/* Top-left controls: Map Style + Terrain */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 max-w-[200px]">
        {/* Map Style Toggle */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-border flex">
          <button
            type="button"
            onClick={() => handleStyleChange('outdoors')}
            className={`p-2 rounded-l-lg transition-colors ${mapStyle === 'outdoors' ? 'bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
            title="Outdoors map"
          >
            <Map size={18} />
          </button>
          <button
            type="button"
            onClick={() => handleStyleChange('satellite')}
            className={`p-2 transition-colors ${mapStyle === 'satellite' ? 'bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
            title="Satellite view"
          >
            <Satellite size={18} />
          </button>
          <button
            type="button"
            onClick={() => handleStyleChange('terrain')}
            className={`p-2 rounded-r-lg transition-colors ${mapStyle === 'terrain' ? 'bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
            title="Terrain view"
          >
            <Mountain size={18} />
          </button>
        </div>

        {/* Flight Radius Control */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-border flex items-center gap-1 px-2 py-1.5">
          <Circle size={14} className="text-purple-500" />
          <select
            value={flightRadius}
            onChange={(e) => setFlightRadius(parseFloat(e.target.value))}
            className="bg-transparent text-sm text-foreground border-none focus:ring-0 cursor-pointer"
          >
            {FLIGHT_RADIUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Visibility Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-border p-1.5 space-y-0.5">
          <button
            type="button"
            onClick={() => setShowUserApiaries(prev => !prev)}
            className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs transition-colors ${showUserApiaries ? 'text-green-600' : 'text-text-tertiary'}`}
          >
            {showUserApiaries ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>Your apiaries</span>
          </button>
          <button
            type="button"
            onClick={() => setShowSharedApiaries(prev => !prev)}
            className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs transition-colors ${showSharedApiaries ? 'text-purple-600' : 'text-text-tertiary'}`}
          >
            {showSharedApiaries ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>Shared apiaries</span>
          </button>
          {isPowerUser && (
            <button
              type="button"
              onClick={() => setShowWildColonies(prev => !prev)}
              className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs transition-colors ${showWildColonies ? 'text-amber-600' : 'text-text-tertiary'}`}
            >
              {showWildColonies ? <Eye size={12} /> : <EyeOff size={12} />}
              <TreeDeciduous size={12} />
              <span>Wild colonies</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowHeatMap(prev => !prev)}
            className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs transition-colors ${showHeatMap ? 'text-orange-600' : 'text-text-tertiary'}`}
            title="Show density heat map"
          >
            <Flame size={12} />
            <span>Heat map</span>
          </button>
        </div>

        {/* Heat map info tooltip when active */}
        {showHeatMap && (
          <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg shadow-lg border border-orange-200 dark:border-orange-800 p-2 max-w-[200px]">
            <p className="text-xs text-orange-800 dark:text-orange-200 break-words">
              <strong>Heat Map:</strong> Warmer colors (red/orange) show areas with more apiaries. Useful for identifying potential drone congregation areas.
            </p>
          </div>
        )}

        {/* Time Filter */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-border flex items-center gap-1 px-2 py-1.5">
          <Calendar size={14} className="text-blue-500" />
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(parseInt(e.target.value))}
            className="bg-transparent text-sm text-foreground border-none focus:ring-0 cursor-pointer"
          >
            {TIME_FILTER_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top-right: Stats Badge + Fullscreen */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {/* Stats Badge */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-border px-3 py-2">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-600 border border-white"></div>
              <span className="font-medium text-foreground">{userApiaries.length}</span>
              <span className="text-text-secondary hidden sm:inline">yours</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-purple-500 border border-white"></div>
              <span className="font-medium text-foreground">{sharedApiaries.length}</span>
              <span className="text-text-secondary hidden sm:inline">shared</span>
            </div>
            {isPowerUser && wildColonies.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-amber-500 border border-white"></div>
                <span className="font-medium text-foreground">{wildColonies.length}</span>
                <span className="text-text-secondary hidden sm:inline">wild</span>
              </div>
            )}
          </div>
        </div>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors border border-border"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>

        {/* Close button in fullscreen */}
        {isFullscreen && (
          <button
            type="button"
            onClick={toggleFullscreen}
            className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg shadow-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400"
            title="Exit fullscreen"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  )

  // Fullscreen mode
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900">
        {mapContent}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="text-purple-600" />
            Community Apiary Map
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            View approximate locations of shared apiaries from other beekeepers
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-purple-800 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-purple-900 dark:text-purple-200">
            <p className="font-medium mb-1">Privacy Protected Locations</p>
            <p className="text-purple-900 dark:text-purple-300">
              All locations are obfuscated to a ~5km radius to protect beekeeper privacy.
              This helps identify general apiary density and potential drone congregation areas
              without revealing exact locations.
            </p>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="bg-surface dark:bg-surface rounded-lg shadow-lg border border-border overflow-hidden">
        {mapContent}
      </div>

      {/* Legend */}
      <div className="bg-surface dark:bg-surface rounded-lg shadow border border-border p-4">
        <h3 className="text-sm font-medium text-foreground mb-3">Map Legend</h3>
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-green-600 border-2 border-white shadow"></div>
            <span className="text-text-secondary">Your apiary (exact location)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-purple-500 opacity-80 border-2 border-white shadow"></div>
            <span className="text-text-secondary">Shared apiary (~5km accuracy)</span>
          </div>
          {isPowerUser && (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-amber-500 border-2 border-white shadow flex items-center justify-center">
                <TreeDeciduous size={12} className="text-white" />
              </div>
              <span className="text-text-secondary">Wild colony (~5km accuracy)</span>
            </div>
          )}
          {flightRadius > 0 && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-green-600/20 border-2 border-green-600/40"></div>
                <span className="text-text-secondary">Your flight radius ({flightRadius}km)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-purple-500/20 border-2 border-purple-500/40"></div>
                <span className="text-text-secondary">Shared flight radius ({flightRadius}km)</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Call to Action - only show if no apiaries at all on map */}
      {sharedApiaries.length === 0 && userApiaries.length === 0 && (
        <div className="text-center py-8 bg-surface dark:bg-surface rounded-lg border border-border">
          <MapPin size={48} className="mx-auto text-text-tertiary mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Apiaries on Map</h3>
          <p className="text-text-secondary max-w-md mx-auto">
            Add GPS coordinates to your apiaries to see them on the map.
            You can also enable location sharing to appear on other users&apos; community maps.
          </p>
        </div>
      )}
    </div>
  )
}
