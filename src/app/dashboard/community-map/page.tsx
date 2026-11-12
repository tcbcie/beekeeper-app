'use client'

import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId, isPowerUserOrAdmin } from '@/lib/auth'
import { getTeamAccess } from '@/lib/team-access'
import { formatDateIrish } from '@/lib/date-utils'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'
import ToggleRow from '@/components/ui/ToggleRow'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useSubmitLock } from '@/hooks/useSubmitLock'
import { MapPin, Users, Maximize2, Minimize2, Layers, X } from 'lucide-react'
// Types only: the library itself is loaded on demand in the map setup effect below.
import type mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useDCAPredictions, type DCAConfirmation } from '@/hooks/useDCAPredictions'
// Other beekeepers' coordinates arrive already offset by the database.

interface ApiaryPoint {
  id: string
  city: string | null
  latitude: number
  longitude: number
  created_at: string
  hive_count: number
}

type SharedApiary = ApiaryPoint

interface UserApiary {
  id: string
  name: string
  city: string | null
  latitude: number
  longitude: number
  created_at: string
  /** Shared with the user through a team, not owned by them. */
  isTeam: boolean
}

interface WildColony {
  id: string
  latitude: number
  longitude: number
  status: string
  nesting_type: string | null
  observation_date: string
}

interface ConservationArea {
  id: string
  name: string
  type: 'apiary' | 'land'
  description: string | null
  latitude: number
  longitude: number
  radius_km: number
  county: string | null
  country: string
  nihbs_url: string | null
}

type AllRegisteredApiary = ApiaryPoint

// Default center (Ireland)
const DEFAULT_CENTER: [number, number] = [-8.2439, 53.4129]

// Map style options
const MAP_STYLES = {
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  terrain: 'mapbox://styles/mapbox/satellite-v9', // Terrain uses satellite with 3D elevation
} as const

type MapStyleKey = keyof typeof MAP_STYLES

const MAP_STYLE_OPTIONS: ReadonlyArray<{ value: MapStyleKey; label: string }> = [
  { value: 'outdoors', label: 'Map' },
  { value: 'satellite', label: 'Satellite' },
  { value: 'terrain', label: 'Terrain' },
]

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

// Layer choices are remembered on this device, so they are not set again on every visit.
const PREFS_KEY = 'community-map-prefs-v1'

interface MapPrefs {
  showUser?: unknown
  showShared?: unknown
  showAll?: unknown
  showWild?: unknown
  showCA?: unknown
  showDCA?: unknown
  flightRadius?: unknown
  dcaApiaries?: unknown
}

function loadPrefs(): MapPrefs {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? (parsed as MapPrefs) : {}
  } catch {
    return {}
  }
}

const savedBool = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback

// Escape HTML to prevent XSS in map popup innerHTML
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Flight radius options (values are km, held as strings for the segmented control)
const FLIGHT_RADIUS_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '0', label: 'Off' },
  { value: '2', label: '2 km' },
  { value: '3', label: '3 km' },
  { value: '5', label: '5 km' },
]
const DEFAULT_FLIGHT_RADIUS = 3

// Every marker gets a 48px tap area around its dot, which keeps its drawn size.
function markerElement(className: string, dotHtml: string): HTMLDivElement {
  const el = document.createElement('div')
  el.className = className
  el.style.cssText = 'width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; cursor: pointer;'
  el.innerHTML = dotHtml
  return el
}

// Popup titles take the popup's own text colour, with a dot in the marker's colour: coloured
// title text was too pale to read on white in sunlight. The right padding clears the close button.
function popupTitle(colour: string, text: string): string {
  return `<div style="font-weight: 600; display: flex; align-items: center; gap: 6px; padding-right: 36px;"><span style="flex-shrink: 0; width: 10px; height: 10px; border-radius: 50%; background: ${colour};"></span>${escapeHtml(text)}</div>`
}

function popupLine(html: string): string {
  return `<div style="font-size: 14px; opacity: 0.8; margin-top: 3px;">${html}</div>`
}

// A button inside a map popup. Built as DOM with a listener, not an inline onclick calling a
// window global: inline handlers break under the CSP, and a global let any script write
// sightings (C7a-18). It is disabled while its action runs, so a double tap cannot fire twice.
function popupButton(label: string, colours: string, onTap: () => Promise<unknown>): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = label
  button.style.cssText = `font-size: 14px; min-height: 48px; padding: 4px 10px; border-radius: 6px; cursor: pointer; ${colours}`
  button.addEventListener('click', async () => {
    button.disabled = true
    try {
      await onTap()
    } finally {
      button.disabled = false
    }
  })
  return button
}

const POPUP_BUTTON_GREEN = 'border: 1px solid #047857; background: #ecfdf5; color: #065f46;'
const POPUP_BUTTON_GREY = 'border: 1px solid #6b7280; background: #f9fafb; color: #374151;'
const POPUP_BUTTON_RED = 'border: 1px solid #b91c1c; background: #fef2f2; color: #991b1b;'

// Other beekeepers' positions are offset by up to 5 km, so a distance to them is only rough.
function roughDistanceText(distanceKm: number): string {
  const rounded = Math.round(distanceKm)
  return rounded < 1 ? 'Under 1 km from your nearest apiary' : `About ${rounded} km from your nearest apiary`
}

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

// The beekeeper's own sighting for a hotspot: the nearest one inside the hotspot's circle.
function findSightingInCircle(
  lat: number,
  lng: number,
  radiusKm: number,
  confirmations: DCAConfirmation[]
): DCAConfirmation | null {
  let nearest: DCAConfirmation | null = null
  let nearestDist = Infinity
  for (const c of confirmations) {
    const d = haversineDistance(lat, lng, Number(c.latitude), Number(c.longitude))
    if (d <= radiusKm && d < nearestDist) {
      nearest = c
      nearestDist = d
    }
  }
  return nearest
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

export default function CommunityMapPage() {
  const [loading, setLoading] = useState(true)
  // Names of the layers that failed to load, shown with a Try again button
  const [loadErrors, setLoadErrors] = useState<string[]>([])
  const [reloadKey, setReloadKey] = useState(0)
  const [reloading, setReloading] = useState(false)
  const [mapFailed, setMapFailed] = useState(false)
  const [sharedApiaries, setSharedApiaries] = useState<SharedApiary[]>([])
  const [userApiaries, setUserApiaries] = useState<UserApiary[]>([])
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('outdoors')
  const [mapLoaded, setMapLoaded] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  // Bumped each time a map style finishes loading, so the overlays are drawn again (a style
  // change wipes them, C7a-05). styleReadyRef is false while a new style loads: adding layers
  // then throws. mapStyleRef is the style being loaded, read by the style.load handler.
  const [styleVersion, setStyleVersion] = useState(0)
  const styleReadyRef = useRef(false)
  const mapStyleRef = useRef<MapStyleKey>('outdoors')
  // Read once. The first render shows only the loading state, so these cannot cause a
  // server/browser mismatch.
  const [savedPrefs] = useState(loadPrefs)
  const [showUserApiaries, setShowUserApiaries] = useState(() => savedBool(savedPrefs.showUser, true))
  const [showSharedApiaries, setShowSharedApiaries] = useState(() => savedBool(savedPrefs.showShared, true))
  const [flightRadius, setFlightRadius] = useState(() =>
    FLIGHT_RADIUS_OPTIONS.some(option => Number(option.value) === savedPrefs.flightRadius)
      ? (savedPrefs.flightRadius as number)
      : DEFAULT_FLIGHT_RADIUS
  )
  const [wildColonies, setWildColonies] = useState<WildColony[]>([])
  const [showWildColonies, setShowWildColonies] = useState(() => savedBool(savedPrefs.showWild, false))
  const [isPowerUser, setIsPowerUser] = useState(false)
  const [conservationAreas, setConservationAreas] = useState<ConservationArea[]>([])
  const [showConservationAreas, setShowConservationAreas] = useState(() => savedBool(savedPrefs.showCA, false))
  const [showDCAPredictions, setShowDCAPredictions] = useState(() => savedBool(savedPrefs.showDCA, false))
  const [selectedDCAApiaries, setSelectedDCAApiaries] = useState<string[]>(() =>
    Array.isArray(savedPrefs.dcaApiaries)
      ? savedPrefs.dcaApiaries.filter((id): id is string => typeof id === 'string')
      : []
  )
  const [allApiaries, setAllApiaries] = useState<AllRegisteredApiary[]>([])
  const [showAllApiaries, setShowAllApiaries] = useState(() => savedBool(savedPrefs.showAll, false))
  // Recording a sighting: first the beekeeper taps the map (recordMode), then confirms the spot
  const [recordMode, setRecordMode] = useState(false)
  const [draftSighting, setDraftSighting] = useState<{ latitude: number; longitude: number } | null>(null)
  const [draftNote, setDraftNote] = useState('')
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markers = useRef<mapboxgl.Marker[]>([])
  // The mapbox-gl module, loaded on demand so the map library isn't part of the page's first load.
  const mapboxRef = useRef<typeof mapboxgl | null>(null)
  const fittedToApiariesRef = useRef(false)
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const saveLock = useSubmitLock()
  // Other beekeepers' hives count as a weak sign of drones near a hotspot. Only the shared layer
  // is used, so a prediction does not depend on the viewer's role.
  const dcaNeighbours = useMemo(() => sharedApiaries.map(apiary => ({
    latitude: Number(apiary.latitude),
    longitude: Number(apiary.longitude),
    hiveCount: Number(apiary.hive_count),
  })), [sharedApiaries])
  const dca = useDCAPredictions(userApiaries, dcaNeighbours)
  const confirmDCA = dca.confirmDCA
  const removeConfirmation = dca.removeConfirmation

  // Ticked apiaries that still exist (a remembered choice may name one since deleted)
  const selectedDCAIds = useMemo(
    () => selectedDCAApiaries.filter(id => userApiaries.some(a => a.id === id)),
    [selectedDCAApiaries, userApiaries]
  )

  // Remember the layer choices on this device
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({
        showUser: showUserApiaries,
        showShared: showSharedApiaries,
        showAll: showAllApiaries,
        showWild: showWildColonies,
        showCA: showConservationAreas,
        showDCA: showDCAPredictions,
        flightRadius,
        dcaApiaries: selectedDCAApiaries,
      }))
    } catch {
      // Storage unavailable or full: the choices just are not remembered
    }
  }, [showUserApiaries, showSharedApiaries, showAllApiaries, showWildColonies, showConservationAreas, showDCAPredictions, flightRadius, selectedDCAApiaries])

  // Check auth and load every layer. The lookups run together, and one that fails is named on
  // screen with a Try again button rather than showing as an empty layer.
  useEffect(() => {
    let cancelled = false
    let redirecting = false

    const init = async () => {
      const failed: string[] = []
      try {
        const id = await getCurrentUserId()
        if (cancelled) return
        if (!id) {
          redirecting = true
          router.push('/login')
          return
        }

        // Own apiaries plus those shared through a team, as on the Apiaries screen
        const loadOwnApiaries = async () => {
          const { sharedApiaryIds } = await getTeamAccess(id)
          let query = supabase
            .from('apiaries')
            .select('id, name, city, latitude, longitude, created_at, user_id')
          query = sharedApiaryIds.length > 0
            ? query.or(`user_id.eq.${id},id.in.(${sharedApiaryIds.join(',')})`)
            : query.eq('user_id', id)
          return query.not('latitude', 'is', null).not('longitude', 'is', null)
        }

        // Wild colonies and the all-apiaries layer are for Power Users and Admins only
        const loadPrivileged = async () => {
          const powerUser = await isPowerUserOrAdmin()
          if (!powerUser) return { powerUser, wild: null, all: null }
          const [wild, all] = await Promise.all([
            supabase.rpc('get_wild_colonies_obfuscated'),
            supabase.rpc('get_all_apiaries_obfuscated'),
          ])
          return { powerUser, wild, all }
        }

        const [shared, own, privileged, areas] = await Promise.all([
          supabase.rpc('get_shared_apiaries_obfuscated'),
          loadOwnApiaries(),
          loadPrivileged(),
          // Through a function, so the rows never carry their owner's id or apiary id
          supabase.rpc('get_conservation_areas'),
        ])
        if (cancelled) return

        // A team-mate's apiary is already on the map as "yours", so it is left out of the
        // offset layers rather than shown a second time a few kilometres away.
        const ownIds = new Set<string>()
        if (own.error || !own.data) {
          failed.push('your apiaries')
        } else {
          const rows = own.data as Array<Omit<UserApiary, 'isTeam'> & { user_id: string }>
          rows.forEach(row => ownIds.add(row.id))
          setUserApiaries(rows.map(({ user_id, ...apiary }) => ({ ...apiary, isTeam: user_id !== id })))
        }

        if (shared.error || !shared.data) {
          failed.push('shared apiaries')
        } else {
          setSharedApiaries((shared.data as SharedApiary[]).filter(apiary => !ownIds.has(apiary.id)))
        }

        setIsPowerUser(privileged.powerUser)
        if (privileged.wild) {
          if (privileged.wild.error || !privileged.wild.data) failed.push('wild colonies')
          else setWildColonies(privileged.wild.data as WildColony[])
        }
        if (privileged.all) {
          if (privileged.all.error || !privileged.all.data) failed.push('all apiaries')
          else setAllApiaries((privileged.all.data as AllRegisteredApiary[]).filter(apiary => !ownIds.has(apiary.id)))
        }

        if (areas.error || !areas.data) failed.push('conservation areas')
        else setConservationAreas(areas.data as ConservationArea[])
      } catch (err) {
        console.error('Failed to load the community map:', err)
        if (failed.length === 0) failed.push('the map layers')
      } finally {
        // Always leave the loading state, so a failure cannot leave the spinner up for good
        if (!cancelled && !redirecting) {
          setLoadErrors(failed)
          setReloading(false)
          setLoading(false)
        }
      }
    }

    init()
    return () => { cancelled = true }
  }, [router, reloadKey])

  // Initialize map
  useEffect(() => {
    if (loading || !mapContainer.current || map.current) return

    // Without a key there is no map; the frame shows a message instead (see mapUnavailable)
    const accessToken = MAPBOX_TOKEN
    if (!accessToken) {
      console.error('Mapbox access token is not configured')
      return
    }

    let cancelled = false
    import('mapbox-gl').then(({ default: mapboxModule }) => {
      if (cancelled || !mapContainer.current || map.current) return
      mapboxRef.current = mapboxModule
      mapboxModule.accessToken = accessToken

      map.current = new mapboxModule.Map({
        container: mapContainer.current,
        style: MAP_STYLES.outdoors,
        center: DEFAULT_CENTER,
        zoom: 6,
      })

      // Bottom right, clear of the Layers button and the counts along the top. The position
      // button asks for the device's location only when it is tapped.
      map.current.addControl(new mapboxModule.NavigationControl(), 'bottom-right')
      map.current.addControl(new mapboxModule.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }), 'bottom-right')

      map.current.on('load', () => {
        setMapLoaded(true)
      })

      // Every finished style load (the first one and each style change): add terrain if that
      // style needs it (once), then redraw the overlays
      map.current.on('style.load', () => {
        const m = map.current
        if (!m) return
        styleReadyRef.current = true
        if (mapStyleRef.current === 'terrain') {
          if (!m.getSource('mapbox-dem')) {
            m.addSource('mapbox-dem', {
              type: 'raster-dem',
              url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
              tileSize: 512,
              maxzoom: 14
            })
          }
          m.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })
        }
        // Terrain is tilted so hills and valleys show; the other views look straight down
        m.easeTo({ pitch: mapStyleRef.current === 'terrain' ? 60 : 0, duration: 600 })
        setStyleVersion(v => v + 1)
      })
    }).catch(err => {
      console.error('Failed to load the map library:', err)
      if (!cancelled) setMapFailed(true)
    })

    return () => {
      cancelled = true
      markers.current.forEach(m => m.remove())
      markers.current = []
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [loading])

  // Open on the beekeeper's own apiaries rather than the whole country (once)
  useEffect(() => {
    const mb = mapboxRef.current
    if (!mapLoaded || !map.current || !mb || fittedToApiariesRef.current || userApiaries.length === 0) return
    fittedToApiariesRef.current = true
    const bounds = new mb.LngLatBounds()
    userApiaries.forEach(apiary => bounds.extend([apiary.longitude, apiary.latitude]))
    map.current.fitBounds(bounds, { padding: 80, maxZoom: 11, duration: 0 })
  }, [mapLoaded, userApiaries])

  // Calculate distance to nearest user apiary
  const calculateNearestDistance = useCallback((lat: number, lng: number): number | undefined => {
    if (userApiaries.length === 0) return undefined
    let minDistance = Infinity
    userApiaries.forEach(apiary => {
      const distance = haversineDistance(lat, lng, apiary.latitude, apiary.longitude)
      if (distance < minDistance) minDistance = distance
    })
    return minDistance === Infinity ? undefined : minDistance
  }, [userApiaries])

  // Save an answer or a sighting and say what happened
  const saveSighting = useCallback(async (lat: number, lng: number, seen: boolean, notes?: string) => {
    const status = await confirmDCA(lat, lng, seen, notes)
    if (status === 'saved') toast.success(seen ? 'Sighting saved' : 'Saved: no drones here')
    else if (status === 'duplicate') toast.info('You already recorded this here in the last week.')
    else toast.error('Could not save. Check your signal and try again.')
    return status
  }, [confirmDCA, toast])

  const removeSighting = useCallback(async (sighting: DCAConfirmation) => {
    const agreed = await confirm({
      title: 'Remove this sighting?',
      message: 'It will no longer count towards your DCA predictions.',
      confirmLabel: 'Remove sighting',
      variant: 'danger',
    })
    if (!agreed) return
    const removed = await removeConfirmation(sighting.id)
    if (removed) toast.success('Sighting removed')
    else toast.error('Could not remove the sighting. Check your signal and try again.')
  }, [confirm, removeConfirmation, toast])

  // Add markers for all apiaries
  useEffect(() => {
    // mapLoaded is only set after the library has loaded and the map exists.
    const mb = mapboxRef.current
    // Wait while a new style loads (adding layers then throws); style.load redraws them
    if (!mapLoaded || !map.current || !mb || !styleReadyRef.current) return

    // Clear existing markers
    markers.current.forEach(m => m.remove())
    markers.current = []

    // Remove existing layers
    const layersToRemove = [
      'user-flight-radius-fill', 'user-flight-radius-outline',
      'shared-flight-radius-fill', 'shared-flight-radius-outline',
      'ca-fill', 'ca-outline',
      'dca-fill', 'dca-outline', 'dca-flyway-lines',
    ]
    const sourcesToRemove = [
      'user-flight-radius', 'shared-flight-radius', 'ca-source',
      'dca-source', 'dca-flyways',
    ]
    layersToRemove.forEach(layer => {
      if (map.current?.getLayer(layer)) map.current.removeLayer(layer)
    })
    sourcesToRemove.forEach(source => {
      if (map.current?.getSource(source)) map.current.removeSource(source)
    })

    const newPopup = () => new mb.Popup({ offset: 15, closeButton: true, closeOnClick: true, maxWidth: '280px' })

    // Add flight radius circles for user apiaries (green)
    if (showUserApiaries && userApiaries.length > 0 && flightRadius > 0) {
      map.current.addSource('user-flight-radius', {
        type: 'geojson',
        data: createMultiCircleGeoJSON(userApiaries, flightRadius)
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
    if (showSharedApiaries && sharedApiaries.length > 0 && flightRadius > 0) {
      map.current.addSource('shared-flight-radius', {
        type: 'geojson',
        data: createMultiCircleGeoJSON(sharedApiaries, flightRadius)
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

    // Add markers for user's own apiaries (green, exact location)
      if (showUserApiaries) {
        userApiaries.forEach(apiary => {
          if (!map.current) return

          const el = markerElement('user-apiary-marker', `<div style="background-color: #16a34a; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>`)

          const popup = newPopup().setHTML(`
            <div style="padding: 4px 8px;">
              ${popupTitle('#16a34a', apiary.name)}
              ${apiary.city ? popupLine(escapeHtml(apiary.city)) : ''}
              ${popupLine(apiary.isTeam ? 'Team apiary' : 'Your apiary')}
            </div>
          `)

          const marker = new mb.Marker({ element: el })
            .setLngLat([apiary.longitude, apiary.latitude])
            .setPopup(popup)
            .addTo(map.current)

          markers.current.push(marker)
        })
      }

      // Add markers for shared apiaries (purple) - coordinates already obfuscated server-side
      if (showSharedApiaries) {
        sharedApiaries.forEach((apiary) => {
          if (!map.current) return

          const distance = calculateNearestDistance(apiary.latitude, apiary.longitude)

          const el = markerElement('community-apiary-marker', `<div style="background-color: #8b5cf6; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); opacity: 0.8;"></div>`)

          const popup = newPopup().setHTML(`
            <div style="padding: 4px 8px;">
              ${popupTitle('#8b5cf6', 'Shared apiary')}
              ${apiary.city ? popupLine(`Near ${escapeHtml(apiary.city)}`) : ''}
              ${popupLine(`${Number(apiary.hive_count)} ${apiary.hive_count === 1 ? 'hive' : 'hives'}`)}
              ${popupLine('Shown up to 5 km from its true position')}
              ${distance !== undefined ? popupLine(roughDistanceText(distance)) : ''}
            </div>
          `)

          const marker = new mb.Marker({ element: el })
            .setLngLat([apiary.longitude, apiary.latitude])
            .setPopup(popup)
            .addTo(map.current)

          markers.current.push(marker)
        })
      }

      // Add markers for all registered apiaries (indigo) - Power Users/Admins only
      // Coordinates already obfuscated server-side
      if (isPowerUser && showAllApiaries) {
        allApiaries.forEach((apiary) => {
          if (!map.current) return

          const distance = calculateNearestDistance(apiary.latitude, apiary.longitude)

          const el = markerElement('all-apiary-marker', `<div style="background-color: #6366f1; width: 18px; height: 18px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); opacity: 0.85;"></div>`)

          const popup = newPopup().setHTML(`
            <div style="padding: 4px 8px;">
              ${popupTitle('#6366f1', 'Registered apiary')}
              ${apiary.city ? popupLine(`Near ${escapeHtml(apiary.city)}`) : ''}
              ${popupLine(`${Number(apiary.hive_count)} ${apiary.hive_count === 1 ? 'hive' : 'hives'}`)}
              ${popupLine('Shown up to 5 km from its true position')}
              ${distance !== undefined ? popupLine(roughDistanceText(distance)) : ''}
            </div>
          `)

          const marker = new mb.Marker({ element: el })
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
            ? colony.nesting_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
            : 'Unknown'

          // Tree/hollow icon to distinguish from managed apiaries
          const el = markerElement('wild-colony-marker', `<div style="display: flex; align-items: center; justify-content: center; background-color: #f59e0b; width: 26px; height: 26px; border-radius: 6px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22v-7"></path>
              <path d="M12 8V2"></path>
              <path d="M12 8c-3 0-6 2-6 5s3 4 6 4 6-1 6-4-3-5-6-5z"></path>
              <circle cx="12" cy="5" r="3"></circle>
            </svg>
          </div>`)

          const popup = newPopup().setHTML(`
            <div style="padding: 4px 8px;">
              ${popupTitle('#f59e0b', 'Wild colony')}
              ${popupLine(escapeHtml(nestingLabel))}
              ${popupLine(`Status: ${escapeHtml(colony.status)}`)}
              ${popupLine('Shown up to 5 km from its true position')}
            </div>
          `)

          const marker = new mb.Marker({ element: el })
            .setLngLat([colony.longitude, colony.latitude])
            .setPopup(popup)
            .addTo(map.current)

          markers.current.push(marker)
        })
      }

    // Add conservation area radius circles and markers
    if (showConservationAreas && conservationAreas.length > 0) {
      // Build GeoJSON FeatureCollection for radius circles
      const caFeatures = conservationAreas.map(ca =>
        createCircleGeoJSON([ca.longitude, ca.latitude], ca.radius_km)
      )
      const caGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
        type: 'FeatureCollection',
        features: caFeatures,
      }

      map.current.addSource('ca-source', { type: 'geojson', data: caGeoJSON })
      map.current.addLayer({
        id: 'ca-fill',
        type: 'fill',
        source: 'ca-source',
        paint: { 'fill-color': '#0d9488', 'fill-opacity': 0.10 },
      })
      map.current.addLayer({
        id: 'ca-outline',
        type: 'line',
        source: 'ca-source',
        paint: { 'line-color': '#0d9488', 'line-width': 2, 'line-opacity': 0.55, 'line-dasharray': [3, 2] },
      })

      // Add centre markers for each CA
      conservationAreas.forEach(ca => {
        if (!map.current) return

        const el = markerElement('ca-marker', `<div style="display: flex; align-items: center; justify-content: center; background-color: #0d9488; width: 22px; height: 22px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 17 3.5s-.1 1.5-2.1 7.2A7 7 0 0 1 11 20z"/>
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
          </svg>
        </div>`)

        // Validate nihbs_url is a safe https link before rendering as href
        const safeUrl = ca.nihbs_url && ca.nihbs_url.startsWith('https://') ? ca.nihbs_url : null
        const nihbsLink = safeUrl
          ? `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-top: 4px; padding: 12px 0; font-size: 14px; font-weight: 600; text-decoration: underline; color: inherit;">View on the NIHBS website</a>`
          : ''
        const typeLabel = ca.type === 'apiary' ? 'Apiary conservation area' : 'Land conservation area'

        const popup = newPopup().setHTML(`
          <div style="padding: 4px 8px;">
            ${popupTitle('#0d9488', ca.name)}
            ${popupLine(`${escapeHtml(typeLabel)}${ca.county ? ` · ${escapeHtml(ca.county)}` : ''}`)}
            ${ca.description ? popupLine(escapeHtml(ca.description)) : ''}
            ${popupLine(`Radius: ${Number(ca.radius_km)} km`)}
            ${nihbsLink}
          </div>
        `)

        const marker = new mb.Marker({ element: el })
          .setLngLat([ca.longitude, ca.latitude])
          .setPopup(popup)
          .addTo(map.current)

        markers.current.push(marker)
      })
    }

    // DCA layer: predicted hotspots (rose; green or grey once the beekeeper has answered) and
    // the beekeeper's own sightings that are not inside a hotspot
    // The layer needs an apiary: without one its switch is hidden, so nothing is drawn either
    if (showDCAPredictions && userApiaries.length > 0) {
      const sightingColour = (sighting: DCAConfirmation | null) =>
        sighting ? (sighting.confirmed ? '#059669' : '#6b7280') : '#e11d48'
      const hotspots = dca.predictions.map(pred => ({
        pred,
        match: findSightingInCircle(pred.latitude, pred.longitude, pred.radiusKm, dca.confirmations),
      }))

      if (hotspots.length > 0) {
        const dcaGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
          type: 'FeatureCollection',
          features: hotspots.map(({ pred, match }) => {
            const feature = createCircleGeoJSON([pred.longitude, pred.latitude], pred.radiusKm)
            feature.properties = { ...feature.properties, color: sightingColour(match) }
            return feature
          }),
        }

        map.current.addSource('dca-source', { type: 'geojson', data: dcaGeoJSON })
        map.current.addLayer({
          id: 'dca-fill',
          type: 'fill',
          source: 'dca-source',
          paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.12 },
        })
        map.current.addLayer({
          id: 'dca-outline',
          type: 'line',
          source: 'dca-source',
          paint: { 'line-color': ['get', 'color'], 'line-width': 2, 'line-opacity': 0.5, 'line-dasharray': [4, 3] },
        })
      }

      // Flyway lines from apiaries to predicted DCAs
      if (hotspots.length > 0 && dca.flyways.length > 0) {
        const flywayGeoJSON: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
          type: 'FeatureCollection',
          features: dca.flyways.map(fw => ({
            type: 'Feature',
            properties: { apiaryName: fw.apiaryName },
            geometry: {
              type: 'LineString',
              coordinates: [
                [fw.fromLongitude, fw.fromLatitude],
                [fw.toLongitude, fw.toLatitude],
              ],
            },
          })),
        }

        map.current.addSource('dca-flyways', { type: 'geojson', data: flywayGeoJSON })
        map.current.addLayer({
          id: 'dca-flyway-lines',
          type: 'line',
          source: 'dca-flyways',
          paint: { 'line-color': '#e11d48', 'line-width': 1.5, 'line-opacity': 0.35, 'line-dasharray': [6, 4] },
        })
      }

      const sightingLines = (sighting: DCAConfirmation) => `
        ${popupLine(`${sighting.confirmed ? 'Drones seen' : 'No drones seen'} on ${escapeHtml(formatDateIrish(sighting.observation_date))}`)}
        ${sighting.notes ? popupLine(escapeHtml(sighting.notes)) : ''}
      `
      const actionRow = (...buttons: HTMLButtonElement[]) => {
        const actions = document.createElement('div')
        actions.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 8px 4px;'
        buttons.forEach(button => actions.appendChild(button))
        return actions
      }

      // Centre markers for each DCA prediction
      hotspots.forEach(({ pred, match }) => {
        if (!map.current) return

        const el = markerElement('dca-marker', `<div style="display: flex; align-items: center; justify-content: center; background-color: ${sightingColour(match)}; width: 22px; height: 22px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="22" y1="12" x2="18" y2="12"></line>
            <line x1="6" y1="12" x2="2" y2="12"></line>
            <line x1="12" y1="6" x2="12" y2="2"></line>
            <line x1="12" y1="22" x2="12" y2="18"></line>
          </svg>
        </div>`)

        const apiaryNames = userApiaries
          .filter(a => pred.contributingApiaries.includes(a.id))
          .map(a => escapeHtml(a.name))
          .join(', ')
        const signalSummary = pred.signalSummary
          ? escapeHtml(pred.signalSummary)
          : 'Weak landscape evidence'
        const popupHeading = match
          ? (match.confirmed ? 'Confirmed DCA' : 'No drones here')
          : pred.isFallback
            ? 'Best guess for a DCA'
            : 'Predicted DCA'

        const content = document.createElement('div')
        content.innerHTML = `
          <div style="padding: 4px 8px;">
            ${popupTitle(sightingColour(match), popupHeading)}
            ${popupLine(`${escapeHtml(pred.direction)} of the apiary · score ${Number(pred.score)} · ${escapeHtml(pred.confidence)} confidence`)}
            ${popupLine(`Signals: ${signalSummary}`)}
            ${apiaryNames ? popupLine(`From: ${apiaryNames}`) : ''}
            ${pred.isFallback && !match ? popupLine('Nothing scored well here, so this is the least unlikely spot.') : ''}
            ${match ? sightingLines(match) : ''}
          </div>
        `
        content.appendChild(match
          ? actionRow(popupButton('Remove my answer', POPUP_BUTTON_RED, () => removeSighting(match)))
          : actionRow(
              popupButton('Drones seen', POPUP_BUTTON_GREEN, () => saveSighting(pred.latitude, pred.longitude, true)),
              popupButton('No drones', POPUP_BUTTON_GREY, () => saveSighting(pred.latitude, pred.longitude, false)),
            ))

        const marker = new mb.Marker({ element: el })
          .setLngLat([pred.longitude, pred.latitude])
          .setPopup(newPopup().setDOMContent(content))
          .addTo(map.current)

        markers.current.push(marker)
      })

      // The beekeeper's own sightings that no hotspot on show already stands for
      const matchedIds = new Set(hotspots.map(({ match }) => match?.id))
      dca.confirmations.forEach(sighting => {
        if (!map.current || matchedIds.has(sighting.id)) return
        const latitude = Number(sighting.latitude)
        const longitude = Number(sighting.longitude)
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return

        const el = markerElement('dca-sighting-marker', `<div style="background-color: white; width: 18px; height: 18px; border-radius: 50%; border: 5px solid ${sightingColour(sighting)}; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`)

        const content = document.createElement('div')
        content.innerHTML = `
          <div style="padding: 4px 8px;">
            ${popupTitle(sightingColour(sighting), sighting.confirmed ? 'Your DCA sighting' : 'No drones here')}
            ${sightingLines(sighting)}
          </div>
        `
        content.appendChild(actionRow(popupButton('Remove sighting', POPUP_BUTTON_RED, () => removeSighting(sighting))))

        const marker = new mb.Marker({ element: el })
          .setLngLat([longitude, latitude])
          .setPopup(newPopup().setDOMContent(content))
          .addTo(map.current)

        markers.current.push(marker)
      })
    }

  }, [mapLoaded, sharedApiaries, userApiaries, showUserApiaries, showSharedApiaries, flightRadius, calculateNearestDistance, isPowerUser, showWildColonies, wildColonies, conservationAreas, showConservationAreas, showDCAPredictions, dca.predictions, dca.flyways, dca.confirmations, saveSighting, removeSighting, allApiaries, showAllApiaries, styleVersion])

  // Recording a sighting, step 1: the next tap on the map picks the spot
  useEffect(() => {
    const m = map.current
    if (!recordMode || !m) return
    const onClick = (e: mapboxgl.MapMouseEvent) => {
      setDraftSighting({ latitude: e.lngLat.lat, longitude: e.lngLat.lng })
      setDraftNote('')
      setRecordMode(false)
    }
    m.on('click', onClick)
    m.getCanvas().style.cursor = 'crosshair'
    return () => {
      m.off('click', onClick)
      m.getCanvas().style.cursor = ''
    }
  }, [recordMode])

  // Step 2: a pin marks the spot until it is saved or cancelled
  useEffect(() => {
    const mb = mapboxRef.current
    if (!draftSighting || !map.current || !mb) return
    const pin = new mb.Marker({ color: '#059669' })
      .setLngLat([draftSighting.longitude, draftSighting.latitude])
      .addTo(map.current)
    return () => { pin.remove() }
  }, [draftSighting])

  const startRecording = () => {
    setShowDCAPredictions(true)
    setDraftSighting(null)
    setPanelOpen(false)
    setRecordMode(true)
  }

  const saveDraftSighting = () => saveLock.run(async () => {
    if (!draftSighting) return
    const status = await saveSighting(draftSighting.latitude, draftSighting.longitude, true, draftNote)
    // A failed save keeps the pin and the note, so the beekeeper can try again
    if (status !== 'failed') {
      setDraftSighting(null)
      setDraftNote('')
    }
  })

  const handlePredict = async () => {
    const result = await dca.calculate(selectedDCAIds)
    if (!result || result.predictions.length === 0) return
    const count = result.predictions.length
    const onlyFallback = result.predictions.every(prediction => prediction.isFallback)
    toast.success(onlyFallback
      ? 'No strong DCA site found. Showing the best guess.'
      : `${count} likely DCA ${count === 1 ? 'site' : 'sites'} found`)
    // Close the panel and bring the hotspots and their apiaries into view
    setPanelOpen(false)
    const mb = mapboxRef.current
    if (!map.current || !mb) return
    const bounds = new mb.LngLatBounds()
    result.predictions.forEach(prediction => bounds.extend([prediction.longitude, prediction.latitude]))
    result.flyways.forEach(flyway => bounds.extend([flyway.fromLongitude, flyway.fromLatitude]))
    map.current.fitBounds(bounds, { padding: 80, maxZoom: 13 })
  }

  const toggleDCALayer = (on: boolean) => {
    setShowDCAPredictions(on)
    if (!on) {
      dca.clear()
      setRecordMode(false)
      setDraftSighting(null)
    }
  }

  // Handle style change
  const handleStyleChange = (newStyle: MapStyleKey) => {
    // The current style: nothing to do (a no-op style change never fires style.load)
    if (!map.current || newStyle === mapStyleRef.current) return
    setMapStyle(newStyle)
    mapStyleRef.current = newStyle
    styleReadyRef.current = false
    // A full rebuild always fires style.load, where terrain and the overlays are added again
    // (Only `diff` is set: Mapbox's types also require the font fields, but passing them would
    // replace the map's own font defaults.)
    map.current.setStyle(MAP_STYLES[newStyle], { diff: false } as Parameters<typeof map.current.setStyle>[1])
  }

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev)
  }, [])

  // The map only resizes itself with the window, so tell it after the frame changes size
  useEffect(() => {
    const frame = requestAnimationFrame(() => map.current?.resize())
    return () => cancelAnimationFrame(frame)
  }, [isFullscreen])

  // Handle Escape key to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

  if (loading) return <LoadingSpinner text="Loading community map..." />

  const mapUnavailable = !MAPBOX_TOKEN || mapFailed
  // In fullscreen the controls keep clear of the phone's status bar and home indicator
  const topEdge = isFullscreen ? 'top-[calc(1rem+env(safe-area-inset-top))]' : 'top-4'
  const bottomEdge = isFullscreen ? 'bottom-[calc(0.5rem+env(safe-area-inset-bottom))]' : 'bottom-2'
  const swatch = (colourClass: string, text: string) => (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-3 flex-shrink-0 rounded-full ${colourClass}`} aria-hidden="true" />
      {text}
    </span>
  )

  // Fullscreen layout wrapper
  const mapContent = (
    <div className={`community-map relative ${isFullscreen ? 'h-full' : ''}`}>
      <div ref={mapContainer} className={`w-full ${isFullscreen ? 'h-full' : 'h-[calc(100dvh-17rem)] min-h-[360px] md:h-[600px]'}`} />

      {mapUnavailable && (
        <div role="alert" className="absolute inset-0 flex items-center justify-center bg-surface p-6 text-center">
          <p className="max-w-sm text-base text-foreground">
            The map could not load. Check your signal, then reload the page.
          </p>
        </div>
      )}

      {/* Top left: one button opens every map control, so the map itself stays clear */}
      {!mapUnavailable && (
        <div className={`absolute left-4 ${topEdge}`}>
          <Button
            type="button"
            onClick={() => setPanelOpen(prev => !prev)}
            aria-expanded={panelOpen}
            aria-controls="map-layers-panel"
            className="shadow-lg"
          >
            <Layers size={18} aria-hidden="true" />
            Layers
          </Button>
        </div>
      )}

      {/* The layers panel: along the bottom of the map on a phone, top left on a larger screen.
          It scrolls inside the map, so every control can be reached. */}
      {panelOpen && !mapUnavailable && (
        <div
          id="map-layers-panel"
          role="region"
          aria-label="Map layers"
          className={`absolute inset-x-2 ${bottomEdge} z-10 max-h-[70%] overflow-y-auto rounded-lg border border-border bg-surface-elevated p-4 shadow-lg sm:inset-x-auto sm:bottom-auto sm:left-4 sm:top-[4.75rem] sm:max-h-[calc(100%-5.75rem)] sm:w-80`}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">Map layers</h2>
            <IconButton type="button" onClick={() => setPanelOpen(false)} aria-label="Close map layers">
              <X size={20} aria-hidden="true" />
            </IconButton>
          </div>

          <div className="mt-2 space-y-4">
            <SegmentedControl
              label="Map view"
              options={MAP_STYLE_OPTIONS}
              value={mapStyle}
              onChange={handleStyleChange}
            />

            <div>
              <ToggleRow
                id="layer-own"
                label={`Your apiaries (${userApiaries.length})`}
                description={swatch('bg-green-600', 'Shown at their exact position')}
                checked={showUserApiaries}
                onChange={setShowUserApiaries}
              />
              <ToggleRow
                id="layer-shared"
                label={`Shared apiaries (${sharedApiaries.length})`}
                description={swatch('bg-purple-500', 'Shown up to 5 km from their true position')}
                checked={showSharedApiaries}
                onChange={setShowSharedApiaries}
              />
              {isPowerUser && (
                <ToggleRow
                  id="layer-all"
                  label={`All apiaries (${allApiaries.length})`}
                  description={swatch('bg-indigo-500', 'Every registered apiary, up to 5 km out')}
                  checked={showAllApiaries}
                  onChange={setShowAllApiaries}
                />
              )}
              {isPowerUser && (
                <ToggleRow
                  id="layer-wild"
                  label={`Wild colonies (${wildColonies.length})`}
                  description={swatch('bg-amber-500', 'Reported wild colonies, up to 5 km out')}
                  checked={showWildColonies}
                  onChange={setShowWildColonies}
                />
              )}
              <ToggleRow
                id="layer-conservation"
                label={`Conservation areas (${conservationAreas.length})`}
                description={swatch('bg-teal-600', 'NIHBS native honey bee conservation areas')}
                checked={showConservationAreas}
                onChange={setShowConservationAreas}
              />
              {userApiaries.length > 0 && (
                <ToggleRow
                  id="layer-dca"
                  label="Drone congregation areas"
                  description={swatch('bg-rose-600', 'Likely DCA sites and your own sightings')}
                  checked={showDCAPredictions}
                  onChange={toggleDCALayer}
                >
                  <fieldset>
                    <legend className="text-sm font-medium text-foreground">Predict from these apiaries</legend>
                    <div className="mt-1 max-h-48 overflow-y-auto">
                      {userApiaries.map(a => (
                        <label key={a.id} className="flex min-h-[48px] cursor-pointer items-center gap-3 text-base text-foreground">
                          <input
                            type="checkbox"
                            checked={selectedDCAIds.includes(a.id)}
                            onChange={(e) => {
                              setSelectedDCAApiaries(prev =>
                                e.target.checked
                                  ? [...prev, a.id]
                                  : prev.filter(id => id !== a.id)
                              )
                            }}
                            className="h-5 w-5 flex-shrink-0 rounded border-border accent-green-700"
                          />
                          <span className="truncate">{a.name}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {selectedDCAIds.length > 10 && (
                    <p className="text-sm text-amber-700 dark:text-amber-400">Only the first 10 apiaries are used.</p>
                  )}
                  <Button
                    type="button"
                    tone="success"
                    fullWidth
                    onClick={handlePredict}
                    disabled={dca.loading || selectedDCAIds.length === 0}
                  >
                    {dca.loading ? 'Reading the terrain...' : 'Predict DCAs'}
                  </Button>
                  <div aria-live="polite" className="text-sm">
                    {dca.error && <p role="alert" className="text-red-700 dark:text-red-400">{dca.error}</p>}
                    {!dca.error && !dca.loading && selectedDCAIds.length === 0 && (
                      <p className="text-text-secondary">Tick at least one apiary to predict from.</p>
                    )}
                    {!dca.error && dca.runStatus === 'empty' && (
                      <p className="text-text-secondary">No likely DCA site was found for these apiaries.</p>
                    )}
                  </div>
                  <Button type="button" fullWidth onClick={startRecording}>
                    <MapPin size={18} aria-hidden="true" />
                    Record a DCA sighting
                  </Button>
                  <ul className="space-y-1 text-sm text-text-secondary">
                    <li>{swatch('bg-rose-600', 'Predicted, not yet checked')}</li>
                    <li>{swatch('bg-emerald-600', 'You saw drones here')}</li>
                    <li>{swatch('bg-gray-500', 'You found no drones here')}</li>
                    <li>Dashed lines run from each apiary to its likely DCA sites.</li>
                  </ul>
                </ToggleRow>
              )}
            </div>

            <div>
              <SegmentedControl
                label="Flight radius"
                options={FLIGHT_RADIUS_OPTIONS}
                value={String(flightRadius)}
                onChange={value => setFlightRadius(Number(value))}
              />
              <p className="mt-1 text-sm text-text-secondary">
                Flight radius: the circle around each apiary that its bees are likely to forage in.
              </p>
            </div>

            <p className="text-sm text-text-secondary">
              Other beekeepers&apos; apiaries are moved by up to 5 km to protect their privacy.
              Your own apiaries are shown where they really are.
            </p>
          </div>
        </div>
      )}

      {/* Recording a sighting, step 1: waiting for the tap on the map */}
      {recordMode && (
        <div role="status" className={`absolute inset-x-2 ${bottomEdge} z-10 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-elevated p-3 shadow-lg sm:left-1/2 sm:right-auto sm:w-96 sm:-translate-x-1/2`}>
          <p className="text-base text-foreground">Tap the map where you saw drones gathering.</p>
          <Button type="button" onClick={() => setRecordMode(false)}>Cancel</Button>
        </div>
      )}

      {/* Step 2: confirm the spot, with an optional note */}
      {draftSighting && (
        <div className={`absolute inset-x-2 ${bottomEdge} z-10 space-y-3 rounded-lg border border-border bg-surface-elevated p-4 shadow-lg sm:left-1/2 sm:right-auto sm:w-96 sm:-translate-x-1/2`}>
          <p className="text-base font-semibold text-foreground">Drones seen at the pin</p>
          <div>
            <label htmlFor="dca-sighting-note" className="block text-sm font-medium text-foreground">
              Note (optional)
            </label>
            <input
              id="dca-sighting-note"
              type="text"
              value={draftNote}
              onChange={e => setDraftNote(e.target.value)}
              maxLength={200}
              enterKeyHint="done"
              placeholder="For example: warm afternoon, loud drone noise"
              className="mt-1 min-h-[48px] w-full rounded-lg border border-border bg-surface px-3 text-base text-foreground"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={() => setDraftSighting(null)} disabled={saveLock.submitting}>
              Cancel
            </Button>
            <Button
              type="button"
              tone="success"
              className="min-h-[56px] flex-1"
              onClick={saveDraftSighting}
              disabled={saveLock.submitting}
            >
              {saveLock.submitting ? 'Saving...' : 'Save sighting'}
            </Button>
          </div>
        </div>
      )}

      {/* Top-right: Stats Badge + Fullscreen */}
      <div className={`absolute right-4 ${topEdge} flex items-center gap-2`}>
        {/* Stats Badge (larger screens; on a phone the counts are in the layers panel) */}
        <div className="hidden bg-surface-elevated rounded-lg shadow-lg border border-border px-3 py-2 sm:block">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-600 border border-white"></div>
              <span className="font-medium text-foreground">{userApiaries.length}</span>
              <span className="text-text-secondary">yours</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-purple-500 border border-white"></div>
              <span className="font-medium text-foreground">{sharedApiaries.length}</span>
              <span className="text-text-secondary">shared</span>
            </div>
            {isPowerUser && allApiaries.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-indigo-500 border border-white"></div>
                <span className="font-medium text-foreground">{allApiaries.length}</span>
                <span className="text-text-secondary">all</span>
              </div>
            )}
            {isPowerUser && wildColonies.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-amber-500 border border-white"></div>
                <span className="font-medium text-foreground">{wildColonies.length}</span>
                <span className="text-text-secondary">wild</span>
              </div>
            )}
            {conservationAreas.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-teal-600 border border-white"></div>
                <span className="font-medium text-foreground">{conservationAreas.length}</span>
                <span className="text-text-secondary">conservation</span>
              </div>
            )}
            {dca.predictions.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-600 border border-white"></div>
                <span className="font-medium text-foreground">{dca.predictions.length}</span>
                <span className="text-text-secondary">DCAs</span>
              </div>
            )}
          </div>
        </div>

        {/* Fullscreen Toggle */}
        <Button
          type="button"
          onClick={toggleFullscreen}
          className="min-w-[48px] bg-surface-elevated p-2 rounded-lg shadow-lg hover:bg-surface-secondary transition-colors border border-border"
          aria-label={isFullscreen ? 'Leave full screen' : 'Show the map full screen'}
        >
          {isFullscreen ? <Minimize2 size={18} aria-hidden="true" /> : <Maximize2 size={18} aria-hidden="true" />}
        </Button>
      </div>
    </div>
  )

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
            Your apiaries, apiaries other beekeepers share, conservation areas and likely drone congregation areas
          </p>
        </div>
      </div>

      {/* A layer that failed to load is named here: an empty layer would read as "nobody has shared" */}
      {loadErrors.length > 0 && (
        <div role="alert" className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-base text-foreground">
            Could not load {loadErrors.join(', ')}. Check your signal and try again.
          </p>
          <Button
            type="button"
            disabled={reloading}
            onClick={() => {
              setReloading(true)
              setReloadKey(key => key + 1)
            }}
          >
            {reloading ? 'Loading...' : 'Try again'}
          </Button>
        </div>
      )}

      {/* Map Container. Fullscreen only changes this frame's classes: rendering a different
          tree destroyed the map's container and left the map blank (C7a-01). */}
      <div className={isFullscreen
        ? 'fixed inset-0 z-50 bg-surface-elevated'
        : 'bg-surface dark:bg-surface rounded-lg shadow-lg border border-border overflow-hidden'}>
        {mapContent}
      </div>

      {/* Call to Action - only show if no apiaries at all on map */}
      {loadErrors.length === 0 && sharedApiaries.length === 0 && userApiaries.length === 0 && (
        <div className="text-center py-8 bg-surface dark:bg-surface rounded-lg border border-border">
          <MapPin size={48} className="mx-auto text-text-tertiary mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No apiaries on the map yet</h3>
          <p className="text-text-secondary max-w-md mx-auto">
            Add a map position to your apiaries to see them here.
            You can also share an apiary&apos;s rough position so it shows on other beekeepers&apos; maps.
          </p>
        </div>
      )}
    </div>
  )
}

