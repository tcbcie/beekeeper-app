/**
 * BEEP API Client Library
 * https://api.beep.nl/docs/
 */

const BEEP_API_BASE = 'https://api.beep.nl/api'
const BEEP_FETCH_TIMEOUT_MS = 30_000

/**
 * Internal fetch wrapper with a hard timeout. SDK fetch has no default
 * timeout; without this, a hung BEEP API will pin a Fluid Compute slot until
 * the function-level deadline. AbortController + signal is the standard
 * pattern.
 */
async function beepFetch(path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), BEEP_FETCH_TIMEOUT_MS)
  try {
    return await fetch(`${BEEP_API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

export interface BeepDevice {
  id: number
  key: string
  name: string
  hive_id: number | null
  type: string
  last_message_received: string | null
  hardware_id: string | null
  firmware_version: string | null
  hardware_version: string | null
  boot_count: number | null
  measurement_interval_min: number | null
  measurement_transmission_ratio: number | null
  ble_pin: string | null
  battery_voltage: number | null
  next_downlink_message: string | null
  last_downlink_result: string | null
  created_at: string
  updated_at: string
}

export interface BeepSensorReading {
  time: string
  weight_kg?: number
  weight_kg_corrected?: number
  t?: number           // temperature (inside)
  t_0?: number         // temperature sensor 0
  t_1?: number         // temperature sensor 1
  t_i?: number         // temperature inside
  h?: number           // humidity
  p?: number           // pressure
  bv?: number          // battery voltage
  s_fan_4?: number     // audio frequency
  s_fan_6?: number
  s_fan_9?: number
  s_fly_a?: number
  s_tot?: number
  bc_i?: number        // brood count inside
  bc_o?: number        // brood count outside
  w_v?: number         // weight velocity
  w_fl?: number        // weight flow
}

export interface BeepLoginResponse {
  api_token: string
  user?: {
    id: number
    name: string
    email: string
  }
}

export interface BeepDevicesResponse {
  devices: BeepDevice[]
}

/**
 * Login to BEEP API and get API token
 */
export async function beepLogin(email: string, password: string): Promise<BeepLoginResponse> {
  const response = await beepFetch('/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }))
    throw new Error(error.message || `Invalid credentials (status ${response.status})`)
  }

  return response.json()
}

/**
 * Get all devices for authenticated user
 */
export async function beepGetDevices(apiToken: string): Promise<BeepDevice[]> {
  const response = await beepFetch('/devices', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('BEEP authentication expired')
    }
    throw new Error(`Failed to fetch devices (status ${response.status})`)
  }

  const data = await response.json()
  if (Array.isArray(data.devices)) return data.devices
  if (Array.isArray(data)) return data
  throw new Error('Unexpected BEEP API response format')
}

/**
 * Get latest sensor values for a device
 */
export async function beepGetLastValues(apiToken: string, deviceId: string): Promise<BeepSensorReading | null> {
  const response = await beepFetch(`/sensors/lastvalues?device_id=${encodeURIComponent(deviceId)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('BEEP authentication expired')
    }
    throw new Error(`Failed to fetch sensor data (status ${response.status})`)
  }

  const data = await response.json()
  return data
}

/**
 * Get historical measurements for a device
 */
export async function beepGetMeasurements(
  apiToken: string,
  deviceId: string,
  startDate: string,
  endDate: string
): Promise<BeepSensorReading[]> {
  const params = new URLSearchParams({
    device_id: deviceId,
    start: startDate,
    end: endDate,
  })

  const response = await beepFetch(`/sensors/measurements?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('BEEP authentication expired')
    }
    throw new Error(`Failed to fetch measurements (status ${response.status})`)
  }

  const data = await response.json()
  return data.measurements || data || []
}
