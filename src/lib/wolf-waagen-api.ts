/**
 * Wolf Waagen API Client Library
 *
 * Wolf Waagen (https://wolf-waagen.de) is a German manufacturer of beehive scales.
 * This library provides TypeScript functions to interact with their API.
 *
 * API Base URL: https://new.app.wolf-waagen.de/api/v1
 * Authentication: Bearer token (provided by Wolf Waagen)
 */

const WOLF_API_BASE = 'https://new.app.wolf-waagen.de/api/v1'

// ============================================================================
// Types
// ============================================================================

/**
 * Wolf Waagen scale device information
 */
export interface WolfScale {
  scale: string                              // Scale ID (e.g., "XVF25AA")
  serial_number: string                      // Serial number (e.g., "41M012345")
  hardware_key: string                       // Hardware key (e.g., "API41")
  latest_transmission_timestamp: string | null  // Last data transmission
}

/**
 * Raw sensor reading from Wolf Waagen API (values are strings with units)
 */
export interface WolfSensorReading {
  time: string
  weight?: string           // "23.550 [kg]"
  yield?: string            // "0.050 [kg]" - daily weight change
  temperature?: string      // "10.0 [°C]"
  brood?: string            // "10.0 [°C]" - brood nest temperature
  humidity?: string         // "50.0 [%]"
  rain?: string             // "0.005 [mm]"
  wind_speed?: string       // "10 [km/h]"
  wind_direction?: string   // "90 [°]"
}

/**
 * Parsed sensor reading with numeric values
 */
export interface WolfParsedReading {
  time: string
  weight_kg?: number
  yield_kg?: number
  temperature_c?: number
  brood_temp_c?: number
  humidity_percent?: number
  rain_mm?: number
  wind_speed_kmh?: number
  wind_direction_deg?: number
}

/**
 * API response wrapper
 */
interface WolfApiResponse<T> {
  success: boolean
  execution_time?: string
  message?: string
  data?: T
  units?: string[]
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse Wolf Waagen value string to number
 * Examples: "23.550 [kg]" → 23.550, "10.0 [°C]" → 10.0
 */
function parseWolfValue(value: string | undefined): number | undefined {
  if (!value) return undefined
  const match = value.match(/^([\d.-]+)/)
  return match ? parseFloat(match[1]) : undefined
}

/**
 * Parse a raw Wolf sensor reading into numeric values
 */
function parseReading(raw: WolfSensorReading): WolfParsedReading {
  return {
    time: raw.time,
    weight_kg: parseWolfValue(raw.weight),
    yield_kg: parseWolfValue(raw.yield),
    temperature_c: parseWolfValue(raw.temperature),
    brood_temp_c: parseWolfValue(raw.brood),
    humidity_percent: parseWolfValue(raw.humidity),
    rain_mm: parseWolfValue(raw.rain),
    wind_speed_kmh: parseWolfValue(raw.wind_speed),
    wind_direction_deg: parseWolfValue(raw.wind_direction),
  }
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get all scales for the authenticated user
 *
 * @param apiToken - Wolf Waagen API bearer token
 * @returns Array of WolfScale objects
 * @throws Error if API call fails
 */
export async function wolfGetScales(apiToken: string): Promise<WolfScale[]> {
  const response = await fetch(`${WOLF_API_BASE}/user/scale`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid Wolf Waagen API token')
    }
    if (response.status === 403) {
      throw new Error('Access denied to Wolf Waagen API')
    }
    throw new Error(`Wolf Waagen API error: ${response.status}`)
  }

  const data: WolfApiResponse<WolfScale[]> = await response.json()

  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch scales')
  }

  return data.data || []
}

/**
 * Get historical measurements for a specific scale
 *
 * @param apiToken - Wolf Waagen API bearer token
 * @param scaleId - Scale ID (e.g., "XVF25AA")
 * @param startTimestamp - Unix timestamp for start of period
 * @param endTimestamp - Unix timestamp for end of period
 * @param resolution - Data resolution: 'hourly' or 'daily'
 * @returns Array of parsed sensor readings
 * @throws Error if API call fails
 */
export async function wolfGetMeasurements(
  apiToken: string,
  scaleId: string,
  startTimestamp: number,
  endTimestamp: number,
  resolution: 'hourly' | 'daily' = 'hourly'
): Promise<WolfParsedReading[]> {
  const response = await fetch(`${WOLF_API_BASE}/user/scale/export`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      scale: scaleId,
      time_start: startTimestamp,
      time_end: endTimestamp,
      time_resolution: resolution,
      format: 'json',
    }),
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid Wolf Waagen API token')
    }
    if (response.status === 403) {
      throw new Error('Access denied to Wolf Waagen API')
    }
    if (response.status === 422) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Invalid request parameters')
    }
    throw new Error(`Wolf Waagen API error: ${response.status}`)
  }

  const data: WolfApiResponse<WolfSensorReading[]> = await response.json()

  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch measurements')
  }

  // Parse all readings to numeric values
  return (data.data || []).map(parseReading)
}

/**
 * Get the latest sensor reading for a scale
 * Wolf Waagen doesn't have a dedicated "last values" endpoint,
 * so we fetch a short time range and return the most recent reading.
 *
 * @param apiToken - Wolf Waagen API bearer token
 * @param scaleId - Scale ID (e.g., "XVF25AA")
 * @returns Latest parsed sensor reading or null if no data
 */
export async function wolfGetLastValues(
  apiToken: string,
  scaleId: string
): Promise<WolfParsedReading | null> {
  const now = Math.floor(Date.now() / 1000)
  const oneDayAgo = now - (24 * 60 * 60)

  const readings = await wolfGetMeasurements(
    apiToken,
    scaleId,
    oneDayAgo,
    now,
    'hourly'
  )

  // Return the most recent reading (last in array)
  return readings.length > 0 ? readings[readings.length - 1] : null
}
