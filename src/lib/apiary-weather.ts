import { supabase } from '@/lib/supabase'

interface NominatimResult {
  lat: string
  lon: string
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

const fetchWeatherData = async (eircode: string, isUkNi: boolean = false) => {
  try {
    const cleanedCode = eircode.trim().replace(/\s+/g, '').toUpperCase()
    const headers = { 'User-Agent': 'HiveCraic/1.0' }
    const country = isUkNi ? 'United Kingdom' : 'Ireland'
    const fallbackLat = isUkNi ? '54.5973' : '53.3498'
    const fallbackLon = isUkNi ? '-5.9301' : '-6.2603'

    const geocodeData = await fetchJsonWithTimeout<NominatimResult[]>(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanedCode)},${country}&format=json&limit=1`,
      { headers }
    )

    if (!Array.isArray(geocodeData) || geocodeData.length === 0) {
      const altData = await fetchJsonWithTimeout<NominatimResult[]>(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanedCode + ' ' + country)}&format=json&limit=1`,
        { headers }
      )

      if (!Array.isArray(altData) || altData.length === 0) {
        return await getWeatherFromCoordinates(fallbackLat, fallbackLon)
      }
      return await getWeatherFromCoordinates(altData[0].lat, altData[0].lon)
    }

    return await getWeatherFromCoordinates(geocodeData[0].lat, geocodeData[0].lon)
  } catch {
    const fallbackLat = isUkNi ? '54.5973' : '53.3498'
    const fallbackLon = isUkNi ? '-5.9301' : '-6.2603'
    return await getWeatherFromCoordinates(fallbackLat, fallbackLon)
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
 * The Eircode path only exists to approximate a position, and Eircode geocoding does not resolve
 * every postcode (see docs/features/irish-grid-reference.md) — falling back to a city centre when
 * it fails. Where the apiary already has coordinates they are exact, need no lookup, and work for
 * apiaries with no postcode at all. The Eircode remains the fallback for older records.
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
    return await fetchWeatherData(apiaryData.eircode, apiaryData.is_uk_ni || false)
  }

  return null
}
