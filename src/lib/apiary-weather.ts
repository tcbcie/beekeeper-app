import { supabase } from '@/lib/supabase'

/** The reply of /api/geocode (src/app/api/geocode/route.ts). */
interface GeocodeResult {
  ok: boolean
  lat?: string
  lon?: string
}

interface OpenMeteoCurrent {
  temperature_2m: number
  relative_humidity_2m: number
  weather_code: number
  wind_speed_10m: number
}

interface OpenMeteoResponse {
  current?: OpenMeteoCurrent | null
}

const WEATHER_REQUEST_TIMEOUT_MS = 8000
const fetchJsonWithTimeout = async <T,>(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = WEATHER_REQUEST_TIMEOUT_MS
): Promise<T> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`)
    }

    return await response.json() as T
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Weather from an Eircode or UK postcode, for apiaries with no map position. Looked up through the
 * app's own route (Google, signed in), the same lookup the apiary form uses. No answer (no signal,
 * signed out, limit reached, not found) means no weather: a city-centre fallback used to record
 * Dublin or Belfast weather without saying so.
 */
const fetchWeatherForPostcode = async (postcode: string, isUkNi: boolean) => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    const place = await fetchJsonWithTimeout<GeocodeResult>(
      `/api/geocode?address=${encodeURIComponent(postcode.trim())}&country=${isUkNi ? 'GB' : 'IE'}`,
      { headers: { Authorization: `Bearer ${session.access_token}` } }
    )
    if (!place?.ok || !place.lat || !place.lon) return null
    return await getWeatherFromCoordinates(place.lat, place.lon)
  } catch {
    return null
  }
}

const getWeatherFromCoordinates = async (lat: string, lon: string) => {
  try {
    const weatherData = await fetchJsonWithTimeout<OpenMeteoResponse>(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Europe/Dublin`
    )
    const current = weatherData?.current
    if (
      !current ||
      typeof current.temperature_2m !== 'number' ||
      typeof current.relative_humidity_2m !== 'number' ||
      typeof current.weather_code !== 'number' ||
      typeof current.wind_speed_10m !== 'number'
    ) {
      return null
    }

    const weatherCodeMap: { [key: number]: string } = {
      0: 'Clear', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
      45: 'Fog', 48: 'Depositing Rime Fog', 51: 'Light Drizzle', 53: 'Moderate Drizzle',
      55: 'Dense Drizzle', 61: 'Slight Rain', 63: 'Moderate Rain', 65: 'Heavy Rain',
      71: 'Slight Snow', 73: 'Moderate Snow', 75: 'Heavy Snow', 80: 'Slight Rain Showers',
      81: 'Moderate Rain Showers', 82: 'Violent Rain Showers', 95: 'Thunderstorm', 96: 'Thunderstorm with Hail'
    }

    return {
      temp: Math.round(current.temperature_2m),
      condition: weatherCodeMap[current.weather_code] ?? 'Unknown',
      humidity: current.relative_humidity_2m,
      wind_speed: Math.round(current.wind_speed_10m)
    }
  } catch {
    return null
  }
}

/**
 * Weather for an apiary, preferring its stored coordinates.
 *
 * Stored coordinates are exact and need no lookup. The Eircode is the fallback for older records
 * without a map position; it may not resolve (see docs/features/irish-grid-reference.md), and then
 * there is no weather rather than a guess.
 */
export const fetchWeatherForApiary = async (apiaryId: string) => {
  const { data: apiaryData, error } = await supabase
    .from('apiaries')
    .select('latitude, longitude, eircode, is_uk_ni')
    .eq('id', apiaryId)
    .single()

  if (error) {
    console.error('Failed to fetch apiary weather metadata:', error)
    return null
  }
  if (!apiaryData) return null

  // Guard explicitly against null/'' — Number(null) is 0, which would silently request
  // weather for the Atlantic at 0°,0°.
  const rawLat = apiaryData.latitude
  const rawLon = apiaryData.longitude
  const lat = rawLat == null || rawLat === '' ? NaN : Number(rawLat)
  const lon = rawLon == null || rawLon === '' ? NaN : Number(rawLon)

  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return await getWeatherFromCoordinates(String(lat), String(lon))
  }

  if (apiaryData.eircode) {
    return await fetchWeatherForPostcode(apiaryData.eircode, apiaryData.is_uk_ni || false)
  }

  return null
}
