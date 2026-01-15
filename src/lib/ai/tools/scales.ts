import { z } from 'zod'
import { Tool } from './index'
import { getSupabase, findHiveByName, formatDate } from './utils'

// Types for scale data
interface ScaleReading {
  time: string
  weight_kg?: number
  temperature_c?: number
  humidity_percent?: number
  brood_temp_c?: number
  yield_kg?: number
}

// Helper to get Wolf API token for a user
async function getWolfToken(userId: string): Promise<string | null> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('profiles')
    .select('wolf_api_token')
    .eq('id', userId)
    .single()
  return data?.wolf_api_token || null
}

// Helper to get BEEP API token for a user
async function getBeepToken(userId: string): Promise<string | null> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('profiles')
    .select('beep_api_token')
    .eq('id', userId)
    .single()
  return data?.beep_api_token || null
}

// Parse Wolf Waagen value - handles both formats:
// - String with units: "23.550 [kg]" -> 23.550
// - Direct number: 23.550 -> 23.550
function parseWolfValue(value: string | number | undefined | null): number | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'number') return isNaN(value) ? undefined : value
  if (typeof value === 'string') {
    const match = value.match(/^([\d.-]+)/)
    return match ? parseFloat(match[1]) : undefined
  }
  return undefined
}

// Fetch Wolf Waagen data
async function fetchWolfData(
  apiToken: string,
  scaleId: string,
  startTimestamp: number,
  endTimestamp: number,
  resolution: 'hourly' | 'daily' = 'hourly'
): Promise<ScaleReading[]> {
  const response = await fetch('https://new.app.wolf-waagen.de/api/v1/user/scale/export', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
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
    throw new Error('Failed to fetch Wolf Waagen data')
  }

  const result = await response.json()
  if (!result.success || !result.data) {
    return []
  }

  return result.data.map((reading: Record<string, string | number>) => ({
    time: reading.time as string,
    weight_kg: parseWolfValue(reading.weight),
    yield_kg: parseWolfValue(reading.yield),
    temperature_c: parseWolfValue(reading.temperature),
    brood_temp_c: parseWolfValue(reading.brood),
    humidity_percent: parseWolfValue(reading.humidity),
  }))
}

// Fetch BEEP data
async function fetchBeepData(
  apiToken: string,
  deviceId: string,
  startDate: string,
  endDate: string
): Promise<ScaleReading[]> {
  const url = `https://api.beep.nl/api/sensors/measurements?device_id=${deviceId}&start=${startDate}&end=${endDate}`

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch BEEP data')
  }

  const result = await response.json()

  // BEEP returns arrays of values for each sensor type
  const readings: ScaleReading[] = []
  const timestamps = result.time || []
  const weights = result.weight_kg_corrected || result.weight_kg || []
  const temps = result.t_i || result.t || []
  const humidity = result.h || []

  for (let i = 0; i < timestamps.length; i++) {
    readings.push({
      time: timestamps[i],
      weight_kg: weights[i],
      temperature_c: temps[i],
      humidity_percent: humidity[i],
    })
  }

  return readings
}

// Get current scale data for a hive
export const getScaleData: Tool = {
  name: 'getScaleData',
  description: 'Get current scale readings (weight, temperature, humidity) for a specific hive. Works with both BEEP and Wolf Waagen scales.',
  parameters: z.object({
    hiveName: z.string().describe('Name or number of the hive')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { hiveName: string }
    const supabase = getSupabase()
    const hive = await findHiveByName(userId, args.hiveName)

    if (!hive) {
      return `Hive "${args.hiveName}" not found.`
    }

    // Get hive details including scale IDs
    const { data: hiveData, error } = await supabase
      .from('hives')
      .select('beep_device_id, beep_device_name, wolf_scale_id, wolf_scale_name')
      .eq('id', hive.id)
      .single()

    if (error || !hiveData) {
      return `Error fetching hive data: ${error?.message || 'Unknown error'}`
    }

    // Check if hive has any scale
    if (!hiveData.beep_device_id && !hiveData.wolf_scale_id) {
      return `Hive "${hive.hive_number}" in ${hive.apiary_name} does not have a scale connected.`
    }

    // Get current readings (last 24 hours - scales may report infrequently)
    const now = Math.floor(Date.now() / 1000)
    const oneDayAgo = now - (24 * 60 * 60)

    try {
      if (hiveData.wolf_scale_id) {
        // Wolf Waagen scale
        const wolfToken = await getWolfToken(userId)
        if (!wolfToken) {
          return 'Wolf Waagen account not connected. Connect it in your profile settings.'
        }

        const readings = await fetchWolfData(wolfToken, hiveData.wolf_scale_id, oneDayAgo, now, 'hourly')

        if (readings.length === 0) {
          return `No recent data from Wolf Waagen scale for hive "${hive.hive_number}".`
        }

        const latest = readings[readings.length - 1]
        return {
          hive: hive.hive_number,
          apiary: hive.apiary_name,
          scaleType: 'Wolf Waagen',
          scaleName: hiveData.wolf_scale_name || hiveData.wolf_scale_id,
          timestamp: formatDate(latest.time),
          weight: latest.weight_kg ? `${latest.weight_kg.toFixed(1)} kg` : 'N/A',
          dailyChange: latest.yield_kg ? `${latest.yield_kg >= 0 ? '+' : ''}${latest.yield_kg.toFixed(2)} kg` : 'N/A',
          temperature: latest.temperature_c ? `${latest.temperature_c.toFixed(1)}°C` : 'N/A',
          broodTemperature: latest.brood_temp_c ? `${latest.brood_temp_c.toFixed(1)}°C` : 'N/A',
          humidity: latest.humidity_percent ? `${latest.humidity_percent.toFixed(0)}%` : 'N/A'
        }
      } else if (hiveData.beep_device_id) {
        // BEEP scale
        const beepToken = await getBeepToken(userId)
        if (!beepToken) {
          return 'BEEP account not connected. Connect it in your profile settings.'
        }

        const endDate = new Date().toISOString()
        const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const readings = await fetchBeepData(beepToken, hiveData.beep_device_id, startDate, endDate)

        if (readings.length === 0) {
          return `No recent data from BEEP scale for hive "${hive.hive_number}".`
        }

        const latest = readings[readings.length - 1]
        return {
          hive: hive.hive_number,
          apiary: hive.apiary_name,
          scaleType: 'BEEP',
          scaleName: hiveData.beep_device_name || hiveData.beep_device_id,
          timestamp: formatDate(latest.time),
          weight: latest.weight_kg ? `${latest.weight_kg.toFixed(1)} kg` : 'N/A',
          temperature: latest.temperature_c ? `${latest.temperature_c.toFixed(1)}°C` : 'N/A',
          humidity: latest.humidity_percent ? `${latest.humidity_percent.toFixed(0)}%` : 'N/A'
        }
      }

      return 'No scale data available.'
    } catch (err) {
      console.error('Scale data fetch error:', err)
      return `Error fetching scale data: ${err instanceof Error ? err.message : 'Unknown error'}`
    }
  }
}

// Get scale history for a hive
export const getScaleHistory: Tool = {
  name: 'getScaleHistory',
  description: 'Get historical scale data (weight, temperature trends) for a hive over a time period. Shows daily averages.',
  parameters: z.object({
    hiveName: z.string().describe('Name or number of the hive'),
    days: z.number().optional().describe('Number of days of history (default 7, max 30)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { hiveName: string; days?: number }
    const supabase = getSupabase()
    const hive = await findHiveByName(userId, args.hiveName)

    if (!hive) {
      return `Hive "${args.hiveName}" not found.`
    }

    const days = Math.min(args.days || 7, 30)

    // Get hive details including scale IDs
    const { data: hiveData, error } = await supabase
      .from('hives')
      .select('beep_device_id, beep_device_name, wolf_scale_id, wolf_scale_name')
      .eq('id', hive.id)
      .single()

    if (error || !hiveData) {
      return `Error fetching hive data: ${error?.message || 'Unknown error'}`
    }

    if (!hiveData.beep_device_id && !hiveData.wolf_scale_id) {
      return `Hive "${hive.hive_number}" in ${hive.apiary_name} does not have a scale connected.`
    }

    const now = Math.floor(Date.now() / 1000)
    const startTimestamp = now - (days * 24 * 60 * 60)

    try {
      let readings: ScaleReading[] = []
      let scaleType = ''

      if (hiveData.wolf_scale_id) {
        const wolfToken = await getWolfToken(userId)
        if (!wolfToken) {
          return 'Wolf Waagen account not connected.'
        }
        readings = await fetchWolfData(wolfToken, hiveData.wolf_scale_id, startTimestamp, now, 'daily')
        scaleType = 'Wolf Waagen'
      } else if (hiveData.beep_device_id) {
        const beepToken = await getBeepToken(userId)
        if (!beepToken) {
          return 'BEEP account not connected.'
        }
        const endDate = new Date().toISOString()
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
        readings = await fetchBeepData(beepToken, hiveData.beep_device_id, startDate, endDate)
        scaleType = 'BEEP'
      }

      if (readings.length === 0) {
        return `No scale history found for hive "${hive.hive_number}" in the last ${days} days.`
      }

      // Calculate summary stats
      const weights = readings.map(r => r.weight_kg).filter((w): w is number => w !== undefined)
      const temps = readings.map(r => r.temperature_c).filter((t): t is number => t !== undefined)

      const avgWeight = weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : null
      const minWeight = weights.length > 0 ? Math.min(...weights) : null
      const maxWeight = weights.length > 0 ? Math.max(...weights) : null
      const weightChange = weights.length >= 2 ? weights[weights.length - 1] - weights[0] : null

      const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null

      return {
        hive: hive.hive_number,
        apiary: hive.apiary_name,
        scaleType,
        period: `Last ${days} days`,
        dataPoints: readings.length,
        weight: {
          current: weights.length > 0 ? `${weights[weights.length - 1].toFixed(1)} kg` : 'N/A',
          average: avgWeight ? `${avgWeight.toFixed(1)} kg` : 'N/A',
          min: minWeight ? `${minWeight.toFixed(1)} kg` : 'N/A',
          max: maxWeight ? `${maxWeight.toFixed(1)} kg` : 'N/A',
          change: weightChange ? `${weightChange >= 0 ? '+' : ''}${weightChange.toFixed(1)} kg` : 'N/A'
        },
        temperature: {
          average: avgTemp ? `${avgTemp.toFixed(1)}°C` : 'N/A'
        },
        trend: weightChange !== null ? (weightChange > 0.5 ? 'Gaining weight' : weightChange < -0.5 ? 'Losing weight' : 'Stable') : 'Unknown'
      }
    } catch (err) {
      console.error('Scale history fetch error:', err)
      return `Error fetching scale history: ${err instanceof Error ? err.message : 'Unknown error'}`
    }
  }
}

// List hives with scales
export const getHivesWithScales: Tool = {
  name: 'getHivesWithScales',
  description: 'List all hives that have a scale (BEEP or Wolf Waagen) connected.',
  parameters: z.object({}),
  execute: async (_rawArgs: unknown, userId: string) => {
    const supabase = getSupabase()

    // Get user's own apiaries
    const { data: apiaries } = await supabase
      .from('apiaries')
      .select('id')
      .eq('user_id', userId)

    if (!apiaries?.length) {
      return 'No apiaries found.'
    }

    const apiaryIds = apiaries.map(a => a.id)

    const { data: hives, error } = await supabase
      .from('hives')
      .select(`
        hive_number,
        beep_device_id,
        beep_device_name,
        wolf_scale_id,
        wolf_scale_name,
        apiaries(name)
      `)
      .in('apiary_id', apiaryIds)
      .is('archived_at', null)
      .or('beep_device_id.not.is.null,wolf_scale_id.not.is.null')
      .order('hive_number')

    if (error) return `Error fetching hives: ${error.message}`
    if (!hives?.length) return 'No hives with scales found.'

    return hives.map(h => {
      const apiary = h.apiaries as unknown as { name: string } | null
      return {
        hive: h.hive_number,
        apiary: apiary?.name || 'Unknown',
        scaleType: h.wolf_scale_id ? 'Wolf Waagen' : 'BEEP',
        scaleName: h.wolf_scale_name || h.wolf_scale_id || h.beep_device_name || h.beep_device_id
      }
    })
  }
}

// Compare scale readings across multiple hives
export const compareScaleReadings: Tool = {
  name: 'compareScaleReadings',
  description: 'Compare current scale readings (weight, temperature) across all hives with scales. Useful for identifying which hives are heaviest or lightest.',
  parameters: z.object({}),
  execute: async (_rawArgs: unknown, userId: string) => {
    const supabase = getSupabase()

    // Get user's apiaries
    const { data: apiaries } = await supabase
      .from('apiaries')
      .select('id')
      .eq('user_id', userId)

    if (!apiaries?.length) {
      return 'No apiaries found.'
    }

    const apiaryIds = apiaries.map(a => a.id)

    const { data: hives, error } = await supabase
      .from('hives')
      .select(`
        id, hive_number,
        beep_device_id, wolf_scale_id,
        apiaries(name)
      `)
      .in('apiary_id', apiaryIds)
      .is('archived_at', null)
      .or('beep_device_id.not.is.null,wolf_scale_id.not.is.null')

    if (error || !hives?.length) {
      return 'No hives with scales found.'
    }

    const now = Math.floor(Date.now() / 1000)
    const oneDayAgo = now - (24 * 60 * 60)
    const results: Array<{
      hive: string
      apiary: string
      weight: number | null
      temperature: number | null
      scaleType: string
    }> = []

    for (const hive of hives) {
      const apiary = hive.apiaries as unknown as { name: string } | null
      try {
        if (hive.wolf_scale_id) {
          const wolfToken = await getWolfToken(userId)
          if (wolfToken) {
            const readings = await fetchWolfData(wolfToken, hive.wolf_scale_id, oneDayAgo, now, 'hourly')
            if (readings.length > 0) {
              const latest = readings[readings.length - 1]
              results.push({
                hive: hive.hive_number,
                apiary: apiary?.name || 'Unknown',
                weight: latest.weight_kg || null,
                temperature: latest.temperature_c || null,
                scaleType: 'Wolf'
              })
            }
          }
        } else if (hive.beep_device_id) {
          const beepToken = await getBeepToken(userId)
          if (beepToken) {
            const endDate = new Date().toISOString()
            const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            const readings = await fetchBeepData(beepToken, hive.beep_device_id, startDate, endDate)
            if (readings.length > 0) {
              const latest = readings[readings.length - 1]
              results.push({
                hive: hive.hive_number,
                apiary: apiary?.name || 'Unknown',
                weight: latest.weight_kg || null,
                temperature: latest.temperature_c || null,
                scaleType: 'BEEP'
              })
            }
          }
        }
      } catch {
        // Skip hives with fetch errors
      }
    }

    if (results.length === 0) {
      return 'Could not fetch scale data from any hives.'
    }

    // Sort by weight (heaviest first)
    results.sort((a, b) => (b.weight || 0) - (a.weight || 0))

    const heaviest = results[0]
    const lightest = results[results.length - 1]

    return {
      hivesCompared: results.length,
      heaviest: heaviest ? { hive: heaviest.hive, weight: `${heaviest.weight?.toFixed(1)} kg` } : null,
      lightest: lightest ? { hive: lightest.hive, weight: `${lightest.weight?.toFixed(1)} kg` } : null,
      readings: results.map(r => ({
        hive: r.hive,
        apiary: r.apiary,
        weight: r.weight ? `${r.weight.toFixed(1)} kg` : 'N/A',
        temperature: r.temperature ? `${r.temperature.toFixed(1)}°C` : 'N/A',
        scaleType: r.scaleType
      }))
    }
  }
}

// Check for unusual weight changes (alerts)
export const checkScaleAlerts: Tool = {
  name: 'checkScaleAlerts',
  description: 'Check for unusual weight changes in hives with scales. Detects potential swarming (sudden weight loss), robbing, or rapid weight gain.',
  parameters: z.object({
    days: z.number().optional().describe('Number of days to analyze (default 7)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { days?: number }
    const days = args.days || 7
    const supabase = getSupabase()

    // Get user's apiaries
    const { data: apiaries } = await supabase
      .from('apiaries')
      .select('id')
      .eq('user_id', userId)

    if (!apiaries?.length) {
      return 'No apiaries found.'
    }

    const apiaryIds = apiaries.map(a => a.id)

    const { data: hives, error } = await supabase
      .from('hives')
      .select(`
        id, hive_number,
        beep_device_id, wolf_scale_id,
        apiaries(name)
      `)
      .in('apiary_id', apiaryIds)
      .is('archived_at', null)
      .or('beep_device_id.not.is.null,wolf_scale_id.not.is.null')

    if (error || !hives?.length) {
      return 'No hives with scales found.'
    }

    const now = Math.floor(Date.now() / 1000)
    const startTimestamp = now - (days * 24 * 60 * 60)
    const alerts: Array<{
      hive: string
      apiary: string
      alertType: string
      details: string
    }> = []

    for (const hive of hives) {
      const apiary = hive.apiaries as unknown as { name: string } | null
      try {
        let readings: ScaleReading[] = []

        if (hive.wolf_scale_id) {
          const wolfToken = await getWolfToken(userId)
          if (wolfToken) {
            readings = await fetchWolfData(wolfToken, hive.wolf_scale_id, startTimestamp, now, 'daily')
          }
        } else if (hive.beep_device_id) {
          const beepToken = await getBeepToken(userId)
          if (beepToken) {
            const endDate = new Date().toISOString()
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
            readings = await fetchBeepData(beepToken, hive.beep_device_id, startDate, endDate)
          }
        }

        if (readings.length >= 2) {
          const weights = readings.map(r => r.weight_kg).filter((w): w is number => w !== undefined)
          if (weights.length >= 2) {
            // Check for sudden weight loss (potential swarm: >2kg in a day)
            for (let i = 1; i < weights.length; i++) {
              const dailyChange = weights[i] - weights[i - 1]
              if (dailyChange < -2) {
                alerts.push({
                  hive: hive.hive_number,
                  apiary: apiary?.name || 'Unknown',
                  alertType: 'Sudden Weight Loss',
                  details: `Lost ${Math.abs(dailyChange).toFixed(1)} kg - possible swarm or robbing`
                })
                break
              }
            }

            // Check for rapid weight gain (>3kg over period - strong flow)
            const totalChange = weights[weights.length - 1] - weights[0]
            if (totalChange > 3) {
              alerts.push({
                hive: hive.hive_number,
                apiary: apiary?.name || 'Unknown',
                alertType: 'Rapid Weight Gain',
                details: `Gained ${totalChange.toFixed(1)} kg over ${days} days - strong nectar flow`
              })
            }

            // Check for significant decline (>2kg over period - possible issue)
            if (totalChange < -2) {
              alerts.push({
                hive: hive.hive_number,
                apiary: apiary?.name || 'Unknown',
                alertType: 'Weight Decline',
                details: `Lost ${Math.abs(totalChange).toFixed(1)} kg over ${days} days - may need feeding`
              })
            }
          }
        }
      } catch {
        // Skip hives with fetch errors
      }
    }

    if (alerts.length === 0) {
      return {
        status: 'All Clear',
        message: `No unusual weight changes detected in the last ${days} days across ${hives.length} hive(s) with scales.`
      }
    }

    return {
      alertCount: alerts.length,
      alerts
    }
  }
}
