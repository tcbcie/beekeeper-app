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
  scale_id: string                           // Scale ID (e.g., "R4JLXN")
  serial_number: string                      // Serial number (e.g., "42M03446")
  hardware_key: string                       // Hardware key (e.g., "API42")
  latest_transmission_timestamp: string | null  // Last data transmission
}

/**
 * Raw sensor reading from Wolf Waagen API
 * Values can be either strings with units ("23.550 [kg]") or direct numbers (23.550)
 */
export interface WolfSensorReading {
  time: string
  weight?: string | number           // "23.550 [kg]" or 23.550
  yield?: string | number            // "0.050 [kg]" - daily weight change
  temperature?: string | number      // "10.0 [°C]"
  brood?: string | number            // "10.0 [°C]" - brood nest temperature
  humidity?: string | number         // "50.0 [%]"
  rain?: string | number             // "0.005 [mm]"
  wind_speed?: string | number       // "10 [km/h]"
  wind_direction?: string | number   // "90 [°]"
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
  battery_voltage?: number
}

/**
 * Trachtnet response data (includes battery voltage)
 */
interface WolfTrachtnetReading {
  time: string
  weight?: number
  longitude?: number
  latitude?: number
  altitude?: number
  temperature?: number
  rain?: number
  humidity?: number
  battery_voltage?: number
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
 * Parse Wolf Waagen value to number
 * Handles both formats:
 * - String with units: "23.550 [kg]" → 23.550
 * - Direct number: 23.550 → 23.550
 */
function parseWolfValue(value: string | number | undefined | null): number | undefined {
  if (value === undefined || value === null) return undefined

  // If already a number, return directly
  if (typeof value === 'number') {
    return isNaN(value) ? undefined : value
  }

  // If string, parse out the numeric part
  if (typeof value === 'string') {
    const match = value.match(/^([\d.-]+)/)
    return match ? parseFloat(match[1]) : undefined
  }

  return undefined
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

  const data = await response.json()

  // Handle different response structures
  if (Array.isArray(data)) {
    return data
  }

  if (!data.success && data.success !== undefined) {
    throw new Error(data.message || 'Failed to fetch scales')
  }

  // API returns scales in 'scales' field
  return data.scales || []
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

/**
 * Get battery voltage from Trachtnet endpoint
 * This endpoint returns battery_voltage which is not available in scale/export
 * Note: Trachtnet uses serial_number, not scale_id
 *
 * @param apiToken - Wolf Waagen API bearer token
 * @param scaleId - Scale ID (e.g., "R4JLXN") - will be converted to serial number
 * @returns Battery voltage or null if unavailable
 */
export async function wolfGetBatteryVoltage(
  apiToken: string,
  scaleId: string
): Promise<number | null> {
  try {
    // Trachtnet endpoint uses serial_number, not scale_id
    // First, look up the serial number for this scale
    const scales = await wolfGetScales(apiToken)
    const scale = scales.find(s => s.scale_id === scaleId)

    if (!scale?.serial_number) {
      return null
    }

    // Get last 24 hours of data
    const now = new Date()
    const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000))

    const formatDate = (d: Date) => d.toISOString().split('T')[0]

    const response = await fetch(`${WOLF_API_BASE}/user/trachtnet/export`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scale: scale.serial_number,
        format: 'json',
        time_start: formatDate(yesterday),
        time_end: formatDate(now),
      }),
    })

    if (!response.ok) {
      return null
    }

    const data: WolfApiResponse<WolfTrachtnetReading[]> = await response.json()

    if (!data.success || !data.data || data.data.length === 0) {
      return null
    }

    // Get the most recent reading with battery voltage
    const lastReading = data.data[data.data.length - 1]
    return lastReading.battery_voltage ?? null
  } catch {
    // Don't throw - battery is optional, just return null
    return null
  }
}
