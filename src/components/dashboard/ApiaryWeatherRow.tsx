'use client'

import { useEffect, useState, useCallback, useRef, startTransition, memo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MapPin, CloudOff, TrendingUp, TrendingDown, Scale, ChevronDown, ListChecks, AlertTriangle, Thermometer, Flower2, Check } from 'lucide-react'

import { differenceInCalendarDays, parseLocalDate } from '@/lib/date-utils'
import { calculateForagingHours, fetchCurrentYearGDD, getBloomingPlants, getNectarConditions, getPollenConditions, haversineDistance, isBloomStale } from '@/lib/gdd'
import type { BloomingPlant, NectarCondition, PollenCondition, VegetationEntry } from '@/lib/gdd'
import { supabase } from '@/lib/supabase'
import type { DashboardApiary } from '@/types/dashboard'
import VegetationInfoModal from '@/components/shared/VegetationInfoModal'

interface DailyForecast {
  day: string
  tempMin: number
  tempMax: number
  tempMinRaw: number  // unrounded, for foraging calculations
  tempMaxRaw: number  // unrounded, for foraging calculations
  weatherCode: number
  sunshineDuration: number  // seconds
  precipitationSum: number  // mm
}

interface CurrentWeather {
  temperature: number
  weatherCode: number
  humidity: number
}

interface ApiaryWeather {
  current: CurrentWeather
  yesterday: DailyForecast | null
  daily: DailyForecast[]
}

interface ScaleWeight {
  hiveId: string
  change24h: number | null
  change7d: number | null
  change30d: number | null
}

interface CacheEntry<T> {
  data: T
  fetchedAt: number
}

const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000
const SCALE_CACHE_TTL_MS = 5 * 60 * 1000
const GDD_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const BLOOM_DATA_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const ACTIVE_BLOOM_CACHE_TTL_MS = 60 * 60 * 1000
const weatherCache = new Map<string, CacheEntry<ApiaryWeather>>()
const scaleCache = new Map<string, CacheEntry<ScaleWeight[]>>()
const gddCache = new Map<string, CacheEntry<number>>()
const gddInflight = new Map<string, Promise<number | null>>()
let bloomDataCache: CacheEntry<VegetationEntry[]> | null = null
let bloomDataInflight: Promise<VegetationEntry[]> | null = null
const activeBloomCache = new Map<string, CacheEntry<string[]>>()

// Module-level community records cache — shared across all cards to avoid N identical RPC calls
interface CommunityRecord { user_id: string; year: number; start_date: string; end_date: string | null; latitude: number; longitude: number; vegetation_name: string | null }
const COMMUNITY_CACHE_TTL_MS = 60 * 60 * 1000
let communityRecordsCache: CacheEntry<CommunityRecord[]> | null = null
let communityInflight: Promise<CommunityRecord[]> | null = null

function weatherIcon(code: number): string {
  if (code === 0) return '\u2600\uFE0F'
  if (code <= 2) return '\u26C5'
  if (code === 3) return '\u2601\uFE0F'
  if (code <= 48) return '\uD83C\uDF2B\uFE0F'
  if (code <= 55) return '\uD83C\uDF26\uFE0F'
  if (code <= 65) return '\uD83C\uDF27\uFE0F'
  if (code <= 75) return '\u2744\uFE0F'
  if (code <= 82) return '\uD83C\uDF27\uFE0F'
  if (code >= 95) return '\u26C8\uFE0F'
  return '\u2601\uFE0F'
}

function weatherLabel(code: number): string {
  if (code === 0) return 'Clear'
  if (code <= 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if (code <= 48) return 'Foggy'
  if (code <= 55) return 'Drizzle'
  if (code <= 65) return 'Rain'
  if (code <= 75) return 'Snow'
  if (code <= 82) return 'Showers'
  if (code >= 95) return 'Thunderstorm'
  return 'Cloudy'
}

function isCacheFresh(fetchedAt: number, ttlMs: number): boolean {
  return Date.now() - fetchedAt < ttlMs
}

function getDaysSinceDate(dateString: string | null): number | null {
  if (!dateString) return null

  const parsedDate = parseLocalDate(dateString)
  if (Number.isNaN(parsedDate.getTime())) return null

  return Math.max(differenceInCalendarDays(parsedDate, new Date()), 0)
}

function formatHiveRiskLabel(count: number): string {
  return `${count} hive${count === 1 ? '' : 's'}`
}

function getQueenIssueSummary(apiary: DashboardApiary): string {
  if (apiary.queenrightAtRiskHiveCount > 0 && apiary.broodAtRiskHiveCount > 0) {
    return `${formatHiveRiskLabel(apiary.queenIssueHiveCount)} need queen/brood check`
  }

  if (apiary.queenrightAtRiskHiveCount > 0) {
    return `${formatHiveRiskLabel(apiary.queenrightAtRiskHiveCount)} lack queen signal`
  }

  if (apiary.broodAtRiskHiveCount > 0) {
    return `${formatHiveRiskLabel(apiary.broodAtRiskHiveCount)} no brood 21+d`
  }

  return 'All hives recent'
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function WeightChip({ label, value }: { label: string; value: number }) {
  const positive = value >= 0
  const Icon = positive ? TrendingUp : TrendingDown

  return (
    <div className="flex flex-col items-center">
      <span className="text-xs font-medium text-text-secondary leading-none mb-0.5">{label}</span>
      <span className={`flex items-center gap-0.5 text-sm font-bold tabular-nums ${
        positive ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
      }`}>
        <Icon size={12} />
        {positive ? '+' : ''}{value.toFixed(2)}
      </span>
    </div>
  )
}

interface ApiaryWeatherRowProps {
  apiary: DashboardApiary
  activeAction?: { type: string; label: string } | null
  onActionDrop?: (apiaryId: string) => void
}

function ApiaryWeatherRow({ apiary, activeAction, onActionDrop }: ApiaryWeatherRowProps) {
  const router = useRouter()
  const [weather, setWeather] = useState<ApiaryWeather | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState(false)
  const [scaleData, setScaleData] = useState<ScaleWeight[]>([])
  const [scaleLoading, setScaleLoading] = useState(false)
  const [shouldLoadData, setShouldLoadData] = useState(false)
  const [forecastExpanded, setForecastExpanded] = useState(false)
  const [gddValue, setGddValue] = useState<number | null>(null)
  const [bloomingPlants, setBloomingPlants] = useState<BloomingPlant[]>([])
  const [bloomExpanded, setBloomExpanded] = useState(false)
  const [vegModalOpen, setVegModalOpen] = useState(false)
  const [vegModalPlant, setVegModalPlant] = useState<{ name: string; typeId: string } | null>(null)
  const [nectarCondition, setNectarCondition] = useState<NectarCondition | null>(null)
  const [pollenCondition, setPollenCondition] = useState<PollenCondition | null>(null)
  const [foragingHours, setForagingHours] = useState<{ yesterday: number | null; today: number | null; tomorrow: number | null } | null>(null)
  const dragCounterRef = useRef(0)
  const cardRef = useRef<HTMLAnchorElement | null>(null)
  const mountedRef = useRef(true)

  const hasCoords = apiary.latitude != null && apiary.longitude != null
  const hasScales = apiary.scales.length > 0
  const weatherCacheKey = hasCoords ? `${apiary.latitude},${apiary.longitude}` : null
  const scaleCacheKey = `${apiary.id}:${apiary.scales.map(scale => `${scale.type}:${scale.deviceId}:${scale.hiveId}`).join('|')}`

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    const node = cardRef.current
    if (!node) return

    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoadData(true)
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setShouldLoadData(true)
          observer.disconnect()
        }
      },
      { rootMargin: '240px 0px' }
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  const fetchWeather = useCallback(async () => {
    if (!hasCoords || !weatherCacheKey || !shouldLoadData) return

    const cachedWeather = weatherCache.get(weatherCacheKey)
    if (cachedWeather && isCacheFresh(cachedWeather.fetchedAt, WEATHER_CACHE_TTL_MS)) {
      setWeather(cachedWeather.data)
      return
    }

    setWeatherLoading(true)
    setWeatherError(false)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15_000)

    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${apiary.latitude}&longitude=${apiary.longitude}&current=temperature_2m,weather_code,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,weather_code,sunshine_duration,precipitation_sum&timezone=Europe/Dublin&past_days=1&forecast_days=7`,
        { signal: controller.signal }
      )
      if (!res.ok) throw new Error('fetch failed')

      const data = await res.json()
      if (!data.current || !data.daily?.time) throw new Error('Unexpected API response shape')

      // past_days=1 prepends yesterday; find today's index to split reliably
      const now = new Date()
      const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const todayIndex = (data.daily.time as string[]).indexOf(todayDate)

      const allDays: DailyForecast[] = data.daily.time.map((date: string, index: number) => ({
        day: DAY_NAMES[new Date(`${date}T12:00:00`).getDay()],
        tempMin: Math.round(data.daily.temperature_2m_min[index]),
        tempMax: Math.round(data.daily.temperature_2m_max[index]),
        tempMinRaw: data.daily.temperature_2m_min[index] ?? 0,
        tempMaxRaw: data.daily.temperature_2m_max[index] ?? 0,
        weatherCode: data.daily.weather_code[index],
        sunshineDuration: data.daily.sunshine_duration?.[index] ?? 0,
        precipitationSum: data.daily.precipitation_sum?.[index] ?? 0,
      }))

      const nextWeather: ApiaryWeather = {
        current: {
          temperature: Math.round(data.current.temperature_2m),
          weatherCode: data.current.weather_code,
          humidity: data.current.relative_humidity_2m ?? 50,
        },
        yesterday: todayIndex > 0 ? allDays[todayIndex - 1] : null,
        daily: todayIndex >= 0 ? allDays.slice(todayIndex) : allDays,
      }

      weatherCache.set(weatherCacheKey, { data: nextWeather, fetchedAt: Date.now() })
      if (!mountedRef.current) return

      startTransition(() => {
        setWeather(nextWeather)
      })
    } catch {
      if (mountedRef.current) {
        setWeatherError(true)
      }
    } finally {
      clearTimeout(timer)
      if (mountedRef.current) {
        setWeatherLoading(false)
      }
    }
  }, [apiary.latitude, apiary.longitude, hasCoords, shouldLoadData, weatherCacheKey])

  const fetchScaleData = useCallback(async () => {
    if (!hasScales || !shouldLoadData) return

    const cachedScaleData = scaleCache.get(scaleCacheKey)
    if (cachedScaleData && isCacheFresh(cachedScaleData.fetchedAt, SCALE_CACHE_TTL_MS)) {
      setScaleData(cachedScaleData.data)
      return
    }

    setScaleLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const results = await Promise.all(
        apiary.scales.map(async scale => {
          try {
            const endpoint = scale.type === 'beep'
              ? `/api/beep/data?deviceId=${scale.deviceId}&hiveId=${scale.hiveId}`
              : `/api/wolf-waagen/data?scaleId=${scale.deviceId}&hiveId=${scale.hiveId}`
            const res = await fetch(endpoint, {
              headers: { Authorization: `Bearer ${session.access_token}` },
            })

            if (!res.ok) {
              return null
            }

            const json = await res.json()
            return {
              hiveId: scale.hiveId,
              change24h: json.weightChange24h ?? null,
              change7d: json.weightChange7d ?? null,
              change30d: json.weightChange30d ?? null,
            } satisfies ScaleWeight
          } catch {
            return null
          }
        })
      )

      const nextScaleData = results.filter((result): result is ScaleWeight => result !== null)
      if (!mountedRef.current) return

      if (nextScaleData.length === apiary.scales.length) {
        scaleCache.set(scaleCacheKey, { data: nextScaleData, fetchedAt: Date.now() })
      }

      startTransition(() => {
        setScaleData(nextScaleData)
      })
    } catch {
      // Scale data is supplementary — fail silently
    } finally {
      if (mountedRef.current) {
        setScaleLoading(false)
      }
    }
  }, [apiary.scales, hasScales, scaleCacheKey, shouldLoadData])

  const fetchGDDAndBloom = useCallback(async () => {
    if (!hasCoords || !weatherCacheKey || !shouldLoadData) return

    try {
    // 1. Fetch current GDD (24h cache, deduplicated across same-location cards)
    let gdd: number | null = null
    const cachedGDD = gddCache.get(weatherCacheKey)
    if (cachedGDD && isCacheFresh(cachedGDD.fetchedAt, GDD_CACHE_TTL_MS)) {
      gdd = cachedGDD.data
    } else {
      if (!gddInflight.has(weatherCacheKey)) {
        gddInflight.set(weatherCacheKey, (async () => {
          try {
            const result = await fetchCurrentYearGDD(apiary.latitude!, apiary.longitude!)
            if (result !== null) {
              gddCache.set(weatherCacheKey, { data: result, fetchedAt: Date.now() })
            }
            return result
          } finally {
            gddInflight.delete(weatherCacheKey)
          }
        })())
      }
      gdd = await gddInflight.get(weatherCacheKey)!
    }

    if (!mountedRef.current || gdd === null) return

    startTransition(() => { setGddValue(gdd) })

    // 2. Fetch vegetation reference data (24h cache, deduplicated across all cards)
    let vegData: VegetationEntry[] = []
    if (bloomDataCache && isCacheFresh(bloomDataCache.fetchedAt, BLOOM_DATA_CACHE_TTL_MS)) {
      vegData = bloomDataCache.data
    } else {
      // Deduplicate: if another card is already fetching, share that promise
      if (!bloomDataInflight) {
        bloomDataInflight = (async () => {
          try {
            const { data } = await supabase
              .from('vegetation_info')
              .select('vegetation_type_id, bloom_period, nectar_value, pollen_value, typical_gdd_range, dropdown_values:vegetation_type_id(value)')

            const entries: VegetationEntry[] = data
              ? data.map((row: Record<string, unknown>) => {
                  // PostgREST may return the join as a single object or an array — handle both
                  const dv = row.dropdown_values
                  const name = Array.isArray(dv) ? dv[0]?.value : (dv as Record<string, unknown> | null)?.value
                  return {
                    vegetationTypeId: row.vegetation_type_id as string,
                    name: (name as string) ?? 'Unknown',
                    typicalGddRange: row.typical_gdd_range as string | null,
                    bloomPeriod: row.bloom_period as string | null,
                    nectarValue: row.nectar_value as number | null,
                    pollenValue: row.pollen_value as number | null,
                  }
                })
              : []
            bloomDataCache = { data: entries, fetchedAt: Date.now() }
            return entries
          } finally {
            bloomDataInflight = null
          }
        })()
      }
      vegData = await bloomDataInflight
    }

    if (!mountedRef.current) return

    // 3. Get predicted blooms from GDD ranges
    const predicted = getBloomingPlants(gdd, vegData)

    // 4. Fetch confirmed bloom observations (1h per-apiary cache)
    const cachedActive = activeBloomCache.get(apiary.id)
    let confirmedNames: string[] = []
    if (cachedActive && isCacheFresh(cachedActive.fetchedAt, ACTIVE_BLOOM_CACHE_TTL_MS)) {
      confirmedNames = cachedActive.data
    } else {
      const now = new Date()
      const currentYear = now.getFullYear()
      const todayStr = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

      // User's own bloom records for this apiary, current year, still active
      const { data: userRecords } = await supabase
        .from('gdd_records')
        .select('dropdown_values(value), end_date')
        .eq('apiary_id', apiary.id)
        .eq('year', currentYear)
        .lte('start_date', todayStr)

      if (userRecords) {
        for (const rec of userRecords) {
          const endDate = (rec as Record<string, unknown>).end_date as string | null
          if (endDate && endDate < todayStr) continue
          const vegName = ((rec as Record<string, unknown>).dropdown_values as Record<string, unknown>[] | null)?.[0]?.value as string | undefined
          if (vegName && !confirmedNames.includes(vegName)) {
            confirmedNames.push(vegName)
          }
        }
      }

      // Community shared records — single RPC, deduplicated across all cards
      try {
        let communityRecords: CommunityRecord[] = []
        if (communityRecordsCache && isCacheFresh(communityRecordsCache.fetchedAt, COMMUNITY_CACHE_TTL_MS)) {
          communityRecords = communityRecordsCache.data
        } else {
          if (!communityInflight) {
            communityInflight = (async () => {
              try {
                const { data } = await supabase.rpc('get_shared_gdd_records')
                const records = (data ?? []) as CommunityRecord[]
                communityRecordsCache = { data: records, fetchedAt: Date.now() }
                return records
              } finally {
                communityInflight = null
              }
            })()
          }
          communityRecords = await communityInflight
        }

        // Filter: exclude own records, within 20km, current year, currently active
        const { data: { session } } = await supabase.auth.getSession()
        const userId = session?.user?.id
        for (const rec of communityRecords) {
          if (rec.user_id === userId) continue
          if (rec.year !== currentYear) continue
          if (rec.start_date > todayStr) continue
          if (rec.end_date && rec.end_date < todayStr) continue
          const dist = haversineDistance(
            apiary.latitude!, apiary.longitude!,
            rec.latitude, rec.longitude
          )
          if (dist > 20) continue
          if (rec.vegetation_name && !confirmedNames.includes(rec.vegetation_name)) {
            confirmedNames.push(rec.vegetation_name)
          }
        }
      } catch {
        // Community data unavailable — continue with user records only
      }

      activeBloomCache.set(apiary.id, { data: confirmedNames, fetchedAt: Date.now() })
    }

    if (!mountedRef.current) return

    // 5. Filter stale confirmed blooms — discard observations where end_date is null
    // but the plant is clearly past its bloom window based on GDD/calendar data
    const validConfirmed = confirmedNames.filter(name => {
      const vegEntry = vegData.find(v => v.name === name)
      return !isBloomStale(gdd, vegEntry)
    })

    // 6. Merge: mark predicted plants as confirmed if they appear in observations
    const merged: BloomingPlant[] = predicted.map(p => ({
      ...p,
      confirmed: validConfirmed.includes(p.name),
    }))
    // Add confirmed plants not in predicted list
    for (const name of validConfirmed) {
      if (!merged.some(p => p.name === name)) {
        const vegEntry = vegData.find(v => v.name === name)
        merged.push({
          name,
          vegetationTypeId: vegEntry?.vegetationTypeId ?? '',
          nectarValue: vegEntry?.nectarValue ?? 0,
          pollenValue: vegEntry?.pollenValue ?? 0,
          confirmed: true,
        })
      }
    }
    // Sort: confirmed first, then by nectar value
    merged.sort((a, b) => {
      if (a.confirmed !== b.confirmed) return a.confirmed ? -1 : 1
      return b.nectarValue - a.nectarValue
    })

    startTransition(() => { setBloomingPlants(merged) })
    } catch {
      // GDD/bloom data is non-critical — fail silently, card still renders without it
    }
  }, [apiary.id, apiary.latitude, apiary.longitude, hasCoords, shouldLoadData, weatherCacheKey])

  useEffect(() => { fetchWeather() }, [fetchWeather])
  useEffect(() => { fetchScaleData() }, [fetchScaleData])
  useEffect(() => { fetchGDDAndBloom() }, [fetchGDDAndBloom])

  // Compute nectar condition and foraging hours when weather data is available
  useEffect(() => {
    if (!weather) return
    const today = weather.daily[0]
    if (!today) return
    // Sum recent precipitation: yesterday + today (actual/observed rain for nectar secretion)
    const recentRain = (weather.yesterday?.precipitationSum ?? 0) + today.precipitationSum
    const condition = getNectarConditions(
      weather.current.temperature,
      weather.current.humidity,
      today.sunshineDuration,
      recentRain
    )
    setNectarCondition(condition)

    // Pollen conditions: uses today's rain only (rain washes pollen off flowers)
    setPollenCondition(getPollenConditions(
      weather.current.temperature,
      weather.current.humidity,
      today.sunshineDuration,
      today.precipitationSum
    ))

    // Foraging window: yesterday / today / tomorrow (use raw temps for precision)
    const calcHours = (d: DailyForecast | null | undefined) =>
      d ? calculateForagingHours(d.tempMinRaw, d.tempMaxRaw, d.sunshineDuration, d.precipitationSum) : null
    setForagingHours({
      yesterday: calcHours(weather.yesterday),
      today: calcHours(today),
      tomorrow: calcHours(weather.daily[1]),
    })
  }, [weather])

  const locationText = apiary.city || apiary.location || null
  const avgWeight = scaleData.length > 0 ? {
    change24h: avg(scaleData.map(scale => scale.change24h)),
    change7d: avg(scaleData.map(scale => scale.change7d)),
    change30d: avg(scaleData.map(scale => scale.change30d)),
  } : null

  const daysSinceInspection = getDaysSinceDate(apiary.lastInspectionDate)
  const daysSinceQueenright = getDaysSinceDate(apiary.lastQueenrightDate)
  const hasQueenIssue = apiary.queenIssueHiveCount > 0

  return (
    <>
    <Link
      ref={cardRef}
      href={`/dashboard/apiaries/${apiary.id}`}
      data-apiary-id={apiary.id}
      onClick={activeAction ? (e) => { e.preventDefault(); onActionDrop?.(apiary.id) } : undefined}
      className={`group block rounded-lg overflow-hidden border-2 bg-surface dark:bg-surface shadow-sm hover:shadow-lg transition-all data-[dragover=true]:border-amber-400 data-[dragover=true]:dark:border-amber-500 data-[dragover=true]:ring-2 data-[dragover=true]:ring-amber-200 data-[dragover=true]:dark:ring-amber-800 data-[dragover=true]:shadow-lg ${
        activeAction
          ? 'border-amber-300 dark:border-amber-600 ring-1 ring-amber-200/50 dark:ring-amber-800/50'
          : 'border-border hover:border-forest-500 dark:hover:border-forest-400'
      }`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('application/x-action')) {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'link'
        }
      }}
      onDragEnter={(e) => {
        if (e.dataTransfer.types.includes('application/x-action')) {
          e.preventDefault()
          dragCounterRef.current++
          if (cardRef.current) cardRef.current.dataset.dragover = 'true'
        }
      }}
      onDragLeave={() => {
        dragCounterRef.current--
        if (dragCounterRef.current <= 0) {
          dragCounterRef.current = 0
          if (cardRef.current) cardRef.current.dataset.dragover = ''
        }
      }}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        dragCounterRef.current = 0
        if (cardRef.current) cardRef.current.dataset.dragover = ''
        const VALID_ACTIONS = ['inspection', 'feeding', 'varroa_check', 'varroa_treatment', 'harvest', 'task']
        const actionType = e.dataTransfer.getData('application/x-action')
        if (actionType && VALID_ACTIONS.includes(actionType)) {
          if (actionType === 'task') {
            router.push(`/dashboard/tasks?create=true&apiary=${apiary.id}`)
          } else {
            router.push(`/dashboard/records?create=${actionType}&apiary=${apiary.id}`)
          }
        }
      }}
    >
      <div className="px-4 py-2.5 bg-gradient-to-r from-forest-600 to-forest-700 dark:from-forest-700 dark:to-forest-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin size={14} className="text-forest-200 shrink-0" />
          <span className="font-semibold text-white text-base truncate">{apiary.name}</span>
          {locationText && (
            <span className="text-forest-200/80 text-sm truncate hidden sm:inline">({locationText})</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {weather && (
            <>
              <span className="text-base leading-none">{weatherIcon(weather.current.weatherCode)}</span>
              <span className="text-lg font-bold text-white tabular-nums">{weather.current.temperature}&deg;</span>
            </>
          )}
          {hasCoords && weatherLoading && (
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/40 border-t-white" />
          )}
          {hasCoords && weatherError && <span className="text-xs text-forest-300">--</span>}
          {!hasCoords && <CloudOff size={13} className="text-forest-300" />}
        </div>
      </div>

      {weather && !activeAction && (
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setForecastExpanded(!forecastExpanded) }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setForecastExpanded(!forecastExpanded) } }}
          aria-expanded={forecastExpanded}
          aria-label={forecastExpanded ? 'Hide 7-day forecast' : 'Show 7-day forecast'}
          className="w-full flex items-center justify-between px-4 py-1 bg-forest-50 dark:bg-surface-elevated text-xs text-forest-700 dark:text-forest-300 hover:bg-forest-100 dark:hover:bg-surface-secondary transition-colors cursor-pointer"
        >
          <span>{weatherLabel(weather.current.weatherCode)}</span>
          <span className="flex items-center gap-1 text-forest-600 dark:text-forest-400">
            <span className="text-[10px] font-medium">{forecastExpanded ? 'Hide' : '7-day'}</span>
            <ChevronDown size={12} className={`transition-transform ${forecastExpanded ? 'rotate-180' : ''}`} />
          </span>
        </div>
      )}

      {weather && forecastExpanded && (
        <div className="border-b border-border">
          <div className="flex items-stretch">
            {weather.daily.map((day, index) => (
              <div
                key={index}
                className={`flex-1 flex flex-col items-center py-1.5 ${
                  index === 0 ? 'bg-forest-50/50 dark:bg-surface-elevated' : ''
                } ${index < weather.daily.length - 1 ? 'border-r border-border/40' : ''}`}
              >
                <span className={`text-xs font-semibold leading-none ${
                  index === 0 ? 'text-forest-700 dark:text-forest-300' : 'text-text-secondary'
                }`}>{day.day}</span>
                <span className="text-sm leading-none my-0.5">{weatherIcon(day.weatherCode)}</span>
                <span className="text-xs leading-none tabular-nums">
                  <span className="font-semibold text-foreground">{day.tempMax}&deg;</span>
                  <span className="text-text-secondary font-medium"> {day.tempMin}&deg;</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {gddValue !== null && !activeAction && (
        <div className="px-3 py-1.5 bg-green-50/50 dark:bg-surface-elevated border-b border-border dark:border-border/70">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 shrink-0">
              <Thermometer size={13} className="text-forest-600 dark:text-forest-400" />
              <span className="text-sm font-bold text-forest-700 dark:text-forest-300 tabular-nums">
                {Math.round(gddValue)} GDD
              </span>
            </div>
            {bloomingPlants.length > 0 && (
              <>
                <div className="w-px h-4 bg-border" />
                <span className="text-xs font-medium text-text-secondary shrink-0">Forage:</span>
                <Flower2 size={13} className="text-green-600 dark:text-green-400 shrink-0" />
                <div className="flex items-center gap-1 min-w-0 flex-wrap">
                  {(bloomExpanded ? bloomingPlants : bloomingPlants.slice(0, 3)).map((plant) => (
                    <span
                      key={plant.name}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setVegModalPlant({ name: plant.name, typeId: plant.vegetationTypeId }); setVegModalOpen(true) }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setVegModalPlant({ name: plant.name, typeId: plant.vegetationTypeId }); setVegModalOpen(true) } }}
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium rounded-full whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity ${
                        plant.confirmed
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      }`}
                    >
                      {plant.confirmed && <Check size={10} className="shrink-0" />}
                      {plant.name}
                    </span>
                  ))}
                  {bloomingPlants.length > 3 && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setBloomExpanded(!bloomExpanded) }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setBloomExpanded(!bloomExpanded) } }}
                      className="text-xs font-medium text-forest-600 dark:text-forest-400 whitespace-nowrap cursor-pointer hover:underline"
                    >
                      {bloomExpanded ? 'less' : `+${bloomingPlants.length - 3} more`}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            {nectarCondition && (
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-text-secondary">Nectar:</span>
                <span className={`text-xs font-bold ${
                  nectarCondition === 'good'
                    ? 'text-green-700 dark:text-green-400'
                    : nectarCondition === 'fair'
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-text-tertiary'
                }`}>
                  {nectarCondition === 'good' ? 'Good' : nectarCondition === 'fair' ? 'Fair' : 'Poor'}
                </span>
              </div>
            )}
            {pollenCondition && (
              <>
                {nectarCondition && <div className="w-px h-3 bg-border" />}
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-text-secondary">Pollen:</span>
                  <span className={`text-xs font-bold ${
                    pollenCondition === 'good'
                      ? 'text-green-700 dark:text-green-400'
                      : pollenCondition === 'fair'
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-text-tertiary'
                  }`}>
                    {pollenCondition === 'good' ? 'Good' : pollenCondition === 'fair' ? 'Fair' : 'Poor'}
                  </span>
                </div>
              </>
            )}
            {foragingHours && (
              <>
                {(nectarCondition || pollenCondition) && <div className="w-px h-3 bg-border" />}
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-text-secondary">Foraging window:</span>
                  <span className="text-xs font-bold tabular-nums text-foreground">
                    {foragingHours.yesterday !== null && <span className="text-text-secondary font-medium">(-1d) {foragingHours.yesterday}h</span>}
                    {foragingHours.yesterday !== null && foragingHours.today !== null && <span className="text-text-tertiary"> · </span>}
                    {foragingHours.today !== null && <span className={foragingHours.today >= 4 ? 'text-green-700 dark:text-green-400' : foragingHours.today >= 2 ? 'text-amber-700 dark:text-amber-400' : 'text-text-tertiary'}>Today {foragingHours.today}h</span>}
                    {foragingHours.today !== null && foragingHours.tomorrow !== null && <span className="text-text-tertiary"> · </span>}
                    {foragingHours.tomorrow !== null && <span className="text-text-secondary font-medium">(+1d) {foragingHours.tomorrow}h</span>}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border dark:border-border/70">
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-medium text-text-secondary leading-none mb-0.5">Hives</span>
          <span className="text-base font-bold text-foreground tabular-nums">{apiary.hiveCount}</span>
        </div>
        <div className="w-px h-5 bg-border" />
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-medium text-text-secondary leading-none mb-0.5">Last Inspected</span>
          {daysSinceInspection !== null ? (
            <span className={`text-base font-bold tabular-nums ${
              daysSinceInspection < 7
                ? 'text-green-700 dark:text-green-400'
                : daysSinceInspection < 14
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-red-700 dark:text-red-400'
            }`}>{daysSinceInspection}d ago</span>
          ) : apiary.hiveCount > 0 ? (
            <span className="text-base font-medium text-text-tertiary">Never</span>
          ) : (
            <span className="text-base font-medium text-text-tertiary">&mdash;</span>
          )}
        </div>
        <div className="w-px h-5 bg-border" />
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-medium text-text-secondary leading-none mb-0.5">Queen Status</span>
          {apiary.hiveCount === 0 ? (
            <span className="text-base font-medium text-text-tertiary">&mdash;</span>
          ) : hasQueenIssue ? (
            <>
              <span className="flex items-center gap-1 text-sm font-bold text-amber-700 dark:text-amber-400 leading-none">
                <AlertTriangle size={14} className="shrink-0" />
                Possible issue
              </span>
              <span className="text-xs font-medium text-amber-700/90 dark:text-amber-300 leading-none mt-0.5">
                {getQueenIssueSummary(apiary)}
              </span>
            </>
          ) : (
            <>
              <span className="text-base font-bold text-green-700 dark:text-green-400 leading-none">Healthy</span>
              <span className="text-xs font-medium text-text-secondary leading-none mt-0.5">
                {daysSinceQueenright !== null ? `Latest ${daysSinceQueenright}d ago` : 'All hives recent'}
              </span>
            </>
          )}
        </div>
        {apiary.activeTaskCount > 0 && !activeAction && (
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/dashboard/tasks?apiary=${apiary.id}`) }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); router.push(`/dashboard/tasks?apiary=${apiary.id}`) } }}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-colors cursor-pointer"
          >
            <ListChecks size={14} />
            <span className="text-sm font-semibold tabular-nums">{apiary.activeTaskCount}</span>
            <span className="text-xs font-medium">task{apiary.activeTaskCount !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {hasScales && (
        <div className="px-3 py-2 flex items-center gap-2">
          <div className="flex items-center gap-1 shrink-0">
            <Scale size={12} className="text-text-tertiary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              Avg ({apiary.scales.length})
            </span>
          </div>
          {scaleLoading && (
            <div className="flex items-center gap-1">
              <div className="animate-spin rounded-full h-3 w-3 border border-text-tertiary border-t-transparent" />
              <span className="text-xs text-text-tertiary">Loading...</span>
            </div>
          )}
          {!scaleLoading && avgWeight && (
            <div className="flex items-center gap-2">
              {avgWeight.change24h !== null && <WeightChip label="Today" value={avgWeight.change24h} />}
              {avgWeight.change24h !== null && avgWeight.change7d !== null && <div className="w-px h-5 bg-border" />}
              {avgWeight.change7d !== null && <WeightChip label="7 Days" value={avgWeight.change7d} />}
              {avgWeight.change7d !== null && avgWeight.change30d !== null && <div className="w-px h-5 bg-border" />}
              {avgWeight.change30d !== null && <WeightChip label="30 Days" value={avgWeight.change30d} />}
            </div>
          )}
          {!scaleLoading && scaleData.length === 0 && (
            <span className="text-xs text-text-tertiary">No data</span>
          )}
        </div>
      )}
    </Link>
    {vegModalOpen && vegModalPlant && (
      <VegetationInfoModal
        isOpen={vegModalOpen}
        onClose={() => { setVegModalOpen(false); setVegModalPlant(null) }}
        vegetationName={vegModalPlant.name}
        vegetationTypeId={vegModalPlant.typeId}
      />
    )}
    </>
  )
}

export default memo(ApiaryWeatherRow)

function avg(values: (number | null)[]): number | null {
  const valid = values.filter((value): value is number => value !== null)
  if (valid.length === 0) return null
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}
