'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { MapPin, Info, Map, Satellite, Users } from 'lucide-react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { obfuscateCoordinates, roundCoordinate } from '@/lib/location-obfuscation'

interface SharedApiary {
  id: string
  city: string | null
  latitude: number
  longitude: number
}

// Default center (Ireland)
const DEFAULT_CENTER: [number, number] = [-8.2439, 53.4129]

// Map style options
const MAP_STYLES = {
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
} as const

type MapStyleKey = keyof typeof MAP_STYLES

export default function CommunityMapPage() {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [sharedApiaries, setSharedApiaries] = useState<SharedApiary[]>([])
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('outdoors')
  const [mapLoaded, setMapLoaded] = useState(false)
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
      setUserId(id)

      // Fetch shared apiaries (excluding user's own)
      const { data, error } = await supabase
        .from('apiaries')
        .select('id, city, latitude, longitude')
        .eq('share_location', true)
        .neq('user_id', id)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)

      if (!error && data) {
        setSharedApiaries(data)
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

  // Add markers for shared apiaries
  useEffect(() => {
    if (!mapLoaded || !map.current) return

    // Clear existing markers
    markers.current.forEach(m => m.remove())
    markers.current = []

    // Add markers for each shared apiary with obfuscated coordinates
    sharedApiaries.forEach(apiary => {
      if (!map.current) return

      // Obfuscate the coordinates
      const obfuscated = obfuscateCoordinates(
        apiary.latitude,
        apiary.longitude,
        apiary.id, // Use apiary ID as seed for deterministic obfuscation
        5 // 5km radius
      )

      // Round to reduce precision further
      const lat = roundCoordinate(obfuscated.latitude, 2) // ~1km precision
      const lng = roundCoordinate(obfuscated.longitude, 2)

      // Create custom marker element
      const el = document.createElement('div')
      el.className = 'community-apiary-marker'
      el.innerHTML = `<div style="background-color: #8b5cf6; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); opacity: 0.8;"></div>`

      // Create popup
      const popup = new mapboxgl.Popup({
        offset: 15,
        closeButton: false,
        closeOnClick: true,
      }).setHTML(`
        <div style="padding: 4px 8px;">
          <div style="font-weight: 600; color: #7c3aed;">Shared Apiary</div>
          ${apiary.city ? `<div style="font-size: 12px; color: #666;">Near ${apiary.city}</div>` : ''}
          <div style="font-size: 11px; color: #999; margin-top: 4px;">~5km accuracy</div>
        </div>
      `)

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current)

      markers.current.push(marker)
    })

    // Fit bounds if there are apiaries
    if (sharedApiaries.length > 0) {
      const bounds = new mapboxgl.LngLatBounds()
      sharedApiaries.forEach(apiary => {
        const obfuscated = obfuscateCoordinates(apiary.latitude, apiary.longitude, apiary.id, 5)
        bounds.extend([obfuscated.longitude, obfuscated.latitude])
      })
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 10 })
    }
  }, [mapLoaded, sharedApiaries])

  // Handle style change
  const handleStyleChange = (newStyle: MapStyleKey) => {
    if (!map.current) return
    setMapStyle(newStyle)
    map.current.setStyle(MAP_STYLES[newStyle])
  }

  if (loading) return <LoadingSpinner text="Loading community map..." />

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
          <Info size={20} className="text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-purple-800 dark:text-purple-200">
            <p className="font-medium mb-1">Privacy Protected Locations</p>
            <p className="text-purple-700 dark:text-purple-300">
              All locations are obfuscated to a ~5km radius to protect beekeeper privacy.
              This helps identify general apiary density and potential drone congregation areas
              without revealing exact locations.
            </p>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="bg-surface dark:bg-surface rounded-lg shadow-lg border border-border overflow-hidden">
        <div className="relative">
          <div ref={mapContainer} className="w-full h-[500px] md:h-[600px]" />

          {/* Map Style Toggle */}
          <div className="absolute top-4 left-4 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-border flex">
            <button
              type="button"
              onClick={() => handleStyleChange('outdoors')}
              className={`p-2 rounded-l-lg transition-colors ${mapStyle === 'outdoors' ? 'bg-purple-100 dark:bg-purple-900 text-purple-600' : 'hover:bg-gray-100 dark:hover:bg-slate-700'}`}
              title="Outdoors map"
            >
              <Map size={18} />
            </button>
            <button
              type="button"
              onClick={() => handleStyleChange('satellite')}
              className={`p-2 rounded-r-lg transition-colors ${mapStyle === 'satellite' ? 'bg-purple-100 dark:bg-purple-900 text-purple-600' : 'hover:bg-gray-100 dark:hover:bg-slate-700'}`}
              title="Satellite view"
            >
              <Satellite size={18} />
            </button>
          </div>

          {/* Stats Badge */}
          <div className="absolute top-4 right-14 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-border px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <MapPin size={16} className="text-purple-600" />
              <span className="font-medium text-foreground">{sharedApiaries.length}</span>
              <span className="text-text-secondary">shared {sharedApiaries.length === 1 ? 'apiary' : 'apiaries'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-surface dark:bg-surface rounded-lg shadow border border-border p-4">
        <h3 className="text-sm font-medium text-foreground mb-3">Map Legend</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-purple-500 opacity-80 border-2 border-white shadow"></div>
            <span className="text-text-secondary">Shared apiary (~5km accuracy)</span>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      {sharedApiaries.length === 0 && (
        <div className="text-center py-8 bg-surface dark:bg-surface rounded-lg border border-border">
          <MapPin size={48} className="mx-auto text-text-tertiary mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Shared Apiaries Yet</h3>
          <p className="text-text-secondary max-w-md mx-auto">
            Be the first to share your apiary location! Go to your Apiaries page,
            edit an apiary with GPS coordinates, and enable location sharing.
          </p>
        </div>
      )}
    </div>
  )
}
