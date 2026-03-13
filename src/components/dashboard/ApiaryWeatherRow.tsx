'use client'

import { useEffect, useState, useCallback, useRef, startTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MapPin, CloudOff, TrendingUp, TrendingDown, Scale, ChevronDown, ListChecks } from 'lucide-react'

import { differenceInCalendarDays, parseLocalDate } from '@/lib/date-utils'
import { supabase } from '@/lib/supabase'
import type { DashboardApiary } from '@/types/dashboard'

interface DailyForecast {
  day: string
  tempMin: number
  tempMax: number
  weatherCode: number
}

interface CurrentWeather {
  temperature: number
  weatherCode: number
}

interface ApiaryWeather {
  current: CurrentWeather
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
const weatherCache = new Map<string, CacheEntry<ApiaryWeather>>()
const scaleCache = new Map<string, CacheEntry<ScaleWeight[]>>()

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
}

export default function ApiaryWeatherRow({ apiary }: ApiaryWeatherRowProps) {
  const router = useRouter()
  const [weather, setWeather] = useState<ApiaryWeather | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState(false)
  const [scaleData, setScaleData] = useState<ScaleWeight[]>([])
  const [scaleLoading, setScaleLoading] = useState(false)
  const [shouldLoadData, setShouldLoadData] = useState(false)
  const [forecastExpanded, setForecastExpanded] = useState(false)
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

    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${apiary.latitude}&longitude=${apiary.longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Europe/Dublin&forecast_days=7`
      )
      if (!res.ok) throw new Error('fetch failed')

      const data = await res.json()
      const nextWeather: ApiaryWeather = {
        current: {
          temperature: Math.round(data.current.temperature_2m),
          weatherCode: data.current.weather_code,
        },
        daily: data.daily.time.map((date: string, index: number) => ({
          day: DAY_NAMES[new Date(`${date}T12:00:00`).getDay()],
          tempMin: Math.round(data.daily.temperature_2m_min[index]),
          tempMax: Math.round(data.daily.temperature_2m_max[index]),
          weatherCode: data.daily.weather_code[index],
        })),
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

      let hadScaleFetchFailure = false
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
              hadScaleFetchFailure = true
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
            hadScaleFetchFailure = true
            return null
          }
        })
      )

      const nextScaleData = results.filter((result): result is ScaleWeight => result !== null)
      if (!mountedRef.current) return

      if (hadScaleFetchFailure) {
        return
      }

      if (nextScaleData.length === apiary.scales.length) {
        scaleCache.set(scaleCacheKey, { data: nextScaleData, fetchedAt: Date.now() })
      }

      startTransition(() => {
        setScaleData(nextScaleData)
      })
    } finally {
      if (mountedRef.current) {
        setScaleLoading(false)
      }
    }
  }, [apiary.scales, hasScales, scaleCacheKey, shouldLoadData])

  useEffect(() => { fetchWeather() }, [fetchWeather])
  useEffect(() => { fetchScaleData() }, [fetchScaleData])

  const locationText = apiary.city || apiary.location || null
  const avgWeight = scaleData.length > 0 ? {
    change24h: avg(scaleData.map(scale => scale.change24h)),
    change7d: avg(scaleData.map(scale => scale.change7d)),
    change30d: avg(scaleData.map(scale => scale.change30d)),
  } : null

  const daysSinceInspection = apiary.lastInspectionDate
    ? differenceInCalendarDays(parseLocalDate(apiary.lastInspectionDate), new Date())
    : null

  return (
    <Link
      ref={cardRef}
      href={`/dashboard/apiaries/${apiary.id}`}
      className="group block rounded-lg overflow-hidden border border-border hover:border-forest-500 dark:hover:border-forest-400 bg-surface dark:bg-surface shadow-sm hover:shadow-lg transition-all"
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

      {weather && (
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setForecastExpanded(!forecastExpanded) }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setForecastExpanded(!forecastExpanded) } }}
          aria-expanded={forecastExpanded}
          aria-label={forecastExpanded ? 'Hide 7-day forecast' : 'Show 7-day forecast'}
          className="w-full flex items-center justify-between px-4 py-1 bg-forest-50 dark:bg-forest-900/20 text-xs text-forest-700 dark:text-forest-300 hover:bg-forest-100 dark:hover:bg-forest-900/30 transition-colors cursor-pointer"
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
                  index === 0 ? 'bg-forest-50/50 dark:bg-forest-900/15' : ''
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

      <div className="px-3 py-2 flex items-center gap-3 border-b border-border/50">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-text-secondary leading-none mb-0.5">Hives</span>
          <span className="text-base font-bold text-foreground tabular-nums">{apiary.hiveCount}</span>
        </div>
        <div className="w-px h-5 bg-border" />
        <div className="flex flex-col">
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
        {apiary.activeTaskCount > 0 && (
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
  )
}

function avg(values: (number | null)[]): number | null {
  const valid = values.filter((value): value is number => value !== null)
  if (valid.length === 0) return null
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}
