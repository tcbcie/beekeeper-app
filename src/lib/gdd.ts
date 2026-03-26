// Shared GDD (Growing Degree Days) utilities
// Extracted from GDDTracker.tsx to avoid duplication

// --- Types ---

export interface OpenMeteoDaily {
  temperature_2m_max: (number | null)[]
  temperature_2m_min: (number | null)[]
  time: string[]
}

export interface BloomingPlant {
  name: string
  nectarValue: number
  pollenValue: number
  confirmed: boolean // true = from user/community observation, false = predicted from GDD range
}

export type NectarCondition = 'good' | 'fair' | 'poor'

// --- Seasonal multiplier (from GDDTracker.tsx:42-46) ---

export function getSeasonalMultiplier(month: number): number {
  if (month === 1) return 0.5
  if (month === 2) return 0.75
  return 1.0
}

// --- Core GDD calculation from Open-Meteo daily data ---

export function calculateGDDFromDaily(daily: OpenMeteoDaily): number {
  let total = 0
  for (let i = 0; i < daily.temperature_2m_max.length; i++) {
    const tMax = daily.temperature_2m_max[i]
    const tMin = daily.temperature_2m_min[i]
    const dateStr = daily.time[i]
    if (tMax !== null && tMin !== null && dateStr) {
      const avgTemp = (tMax + tMin) / 2
      if (avgTemp > 0) {
        // Extract month from YYYY-MM-DD string directly — avoids 365 Date allocations
        const month = parseInt(dateStr.slice(5, 7), 10)
        total += avgTemp * getSeasonalMultiplier(month)
      }
    }
  }
  return Math.round(total * 10) / 10
}

// --- Fetch current year GDD for a location ---

const GDD_FETCH_TIMEOUT_MS = 15_000

export async function fetchCurrentYearGDD(lat: number, lon: number): Promise<number | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GDD_FETCH_TIMEOUT_MS)

  try {
    const now = new Date()
    const year = now.getFullYear()
    const janFirst = `${year}-01-01`
    const today = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const res = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${janFirst}&end_date=${today}&daily=temperature_2m_max,temperature_2m_min&timezone=Europe/Dublin`,
      { signal: controller.signal }
    )
    if (!res.ok) return null

    const data = await res.json()
    if (!data.daily?.temperature_2m_max || !data.daily?.time) return null

    return calculateGDDFromDaily(data.daily)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// --- Parse GDD range string ("200–400" or "200-400") ---

export function parseGDDRange(range: string | null): { min: number; max: number } | null {
  if (!range) return null
  // Handle en-dash (–), em-dash (—), and regular hyphen (-)
  const parts = range.includes('\u2013') ? range.split('\u2013')
    : range.includes('\u2014') ? range.split('\u2014')
    : range.split('-')
  if (parts.length !== 2) return null
  const min = parseFloat(parts[0].trim())
  const max = parseFloat(parts[1].trim())
  if (isNaN(min) || isNaN(max)) return null
  return { min, max }
}

// --- Determine which plants are blooming based on current GDD + calendar month ---

export interface VegetationEntry {
  name: string
  typicalGddRange: string | null
  bloomPeriod: string | null
  nectarValue: number | null
  pollenValue: number | null
}

const MONTH_NAMES: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
}

/**
 * Parse bloom_period text like "March–May", "January–June (peak March–April)"
 * into a set of month numbers. Returns null if unparseable.
 */
export function parseBloomMonths(period: string | null): Set<number> | null {
  if (!period) return null

  // Strip parenthetical notes like "(species dependent)", "(peak March–April)"
  const cleaned = period.replace(/\(.*?\)/g, '').trim()

  // Split on en-dash, em-dash, or hyphen
  const parts = cleaned.includes('\u2013') ? cleaned.split('\u2013')
    : cleaned.includes('\u2014') ? cleaned.split('\u2014')
    : cleaned.split('-')
  if (parts.length !== 2) return null

  const startMonth = MONTH_NAMES[parts[0].trim().toLowerCase()]
  const endMonth = MONTH_NAMES[parts[1].trim().toLowerCase()]
  if (!startMonth || !endMonth) return null

  const months = new Set<number>()
  if (startMonth <= endMonth) {
    for (let m = startMonth; m <= endMonth; m++) months.add(m)
  } else {
    // Wraps around year (e.g. November–April)
    for (let m = startMonth; m <= 12; m++) months.add(m)
    for (let m = 1; m <= endMonth; m++) months.add(m)
  }
  return months
}

export function getBloomingPlants(currentGDD: number, vegetation: VegetationEntry[]): BloomingPlant[] {
  const blooming: BloomingPlant[] = []
  const currentMonth = new Date().getMonth() + 1

  for (const veg of vegetation) {
    // Skip entries with no usable name
    if (!veg.name || veg.name === 'Unknown') continue

    const gddRange = parseGDDRange(veg.typicalGddRange)
    const bloomMonths = parseBloomMonths(veg.bloomPeriod)

    // Must pass at least one filter (GDD range or calendar month)
    const gddMatch = gddRange ? currentGDD >= gddRange.min && currentGDD <= gddRange.max : false
    const calendarMatch = bloomMonths ? bloomMonths.has(currentMonth) : false

    // Include if both GDD and calendar agree, or if only one source is available and it matches
    const include = gddRange && bloomMonths
      ? gddMatch && calendarMatch   // Both available: must both match (strongest signal)
      : gddMatch || calendarMatch   // Only one available: use whichever we have

    if (include) {
      blooming.push({
        name: veg.name,
        nectarValue: veg.nectarValue ?? 0,
        pollenValue: veg.pollenValue ?? 0,
        confirmed: false,
      })
    }
  }

  // Sort by nectar value descending (most valuable forage first)
  blooming.sort((a, b) => b.nectarValue - a.nectarValue)
  return blooming
}

// --- Nectar conditions assessment from weather data ---

export function getNectarConditions(
  currentTemp: number,
  humidity: number,
  sunshineDurationSeconds: number,
  recentRainMm: number
): NectarCondition {
  let score = 0

  // Temperature: 15-25°C ideal for nectar secretion
  if (currentTemp >= 15 && currentTemp <= 25) score += 2
  else if ((currentTemp >= 10 && currentTemp < 15) || (currentTemp > 25 && currentTemp <= 30)) score += 1

  // Sunshine: >4h good, 2-4h fair
  const sunshineHours = sunshineDurationSeconds / 3600
  if (sunshineHours > 4) score += 2
  else if (sunshineHours >= 2) score += 1

  // Recent rain (last 3 days): 2-10mm ideal, some moisture needed but not waterlogged
  if (recentRainMm >= 2 && recentRainMm <= 10) score += 2
  else if ((recentRainMm >= 0.5 && recentRainMm < 2) || (recentRainMm > 10 && recentRainMm <= 20)) score += 1

  // Humidity: 40-70% ideal for nectar production
  if (humidity >= 40 && humidity <= 70) score += 2
  else if ((humidity >= 30 && humidity < 40) || (humidity > 70 && humidity <= 85)) score += 1

  // Total: 0-8, Good: 6-8, Fair: 3-5, Poor: 0-2
  if (score >= 6) return 'good'
  if (score >= 3) return 'fair'
  return 'poor'
}

// --- Haversine distance (km) - reused from GDDDataTab.tsx:164-173 ---

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
