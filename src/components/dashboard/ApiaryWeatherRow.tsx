'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { MapPin, CloudOff, TrendingUp, TrendingDown, Scale } from 'lucide-react'
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

// WMO weather code to emoji icon
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

// WMO code to short description
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

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function WeightChip({ label, value }: { label: string; value: number }) {
  const positive = value >= 0
  const Icon = positive ? TrendingUp : TrendingDown
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] text-text-tertiary leading-none mb-0.5">{label}</span>
      <span className={`flex items-center gap-0.5 text-xs font-bold tabular-nums ${
        positive ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
      }`}>
        <Icon size={10} />
        {positive ? '+' : ''}{value.toFixed(2)}
      </span>
    </div>
  )
}

interface ApiaryWeatherRowProps {
  apiary: DashboardApiary
}

export default function ApiaryWeatherRow({ apiary }: ApiaryWeatherRowProps) {
  const [weather, setWeather] = useState<ApiaryWeather | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState(false)
  const [scaleData, setScaleData] = useState<ScaleWeight[]>([])
  const [scaleLoading, setScaleLoading] = useState(false)

  const hasCoords = apiary.latitude != null && apiary.longitude != null
  const hasScales = apiary.scales.length > 0

  const fetchWeather = useCallback(async () => {
    if (!hasCoords) return
    setWeatherLoading(true)
    setWeatherError(false)
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${apiary.latitude}&longitude=${apiary.longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Europe/Dublin&forecast_days=7`
      )
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      setWeather({
        current: {
          temperature: Math.round(data.current.temperature_2m),
          weatherCode: data.current.weather_code,
        },
        daily: data.daily.time.map((date: string, i: number) => ({
          day: DAY_NAMES[new Date(date + 'T12:00:00').getDay()],
          tempMin: Math.round(data.daily.temperature_2m_min[i]),
          tempMax: Math.round(data.daily.temperature_2m_max[i]),
          weatherCode: data.daily.weather_code[i],
        })),
      })
    } catch {
      setWeatherError(true)
    } finally {
      setWeatherLoading(false)
    }
  }, [apiary.latitude, apiary.longitude, hasCoords])

  const fetchScaleData = useCallback(async () => {
    if (!hasScales) return
    setScaleLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const results: ScaleWeight[] = []
      for (const scale of apiary.scales) {
        try {
          const endpoint = scale.type === 'beep'
            ? `/api/beep/data?deviceId=${scale.deviceId}&hiveId=${scale.hiveId}`
            : `/api/wolf-waagen/data?scaleId=${scale.deviceId}&hiveId=${scale.hiveId}`
          const res = await fetch(endpoint, {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          })
          if (res.ok) {
            const json = await res.json()
            results.push({
              hiveId: scale.hiveId,
              change24h: json.weightChange24h ?? null,
              change7d: json.weightChange7d ?? null,
              change30d: json.weightChange30d ?? null,
            })
          }
        } catch { /* skip */ }
      }
      setScaleData(results)
    } catch { /* silently fail */ } finally {
      setScaleLoading(false)
    }
  }, [hasScales, apiary.scales])

  useEffect(() => { fetchWeather() }, [fetchWeather])
  useEffect(() => { fetchScaleData() }, [fetchScaleData])

  const locationText = apiary.city || apiary.location || null
  const avgWeight = scaleData.length > 0 ? {
    change24h: avg(scaleData.map(s => s.change24h)),
    change7d: avg(scaleData.map(s => s.change7d)),
    change30d: avg(scaleData.map(s => s.change30d)),
  } : null

  const daysSinceInspection = apiary.lastInspectionDate
    ? Math.floor((Date.now() - new Date(apiary.lastInspectionDate).getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <Link
      href={`/dashboard/apiaries/${apiary.id}`}
      className="group block rounded-lg overflow-hidden border border-border hover:border-forest-500 dark:hover:border-forest-400 bg-surface dark:bg-surface shadow-sm hover:shadow-lg transition-all"
    >
      {/* Header — name + current weather */}
      <div className="px-4 py-2.5 bg-gradient-to-r from-forest-600 to-forest-700 dark:from-forest-700 dark:to-forest-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin size={13} className="text-forest-200 shrink-0" />
          <span className="font-semibold text-white text-sm truncate">{apiary.name}</span>
          {locationText && (
            <span className="text-forest-200/80 text-xs truncate hidden sm:inline">({locationText})</span>
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

      {/* Weather description */}
      {weather && (
        <div className="px-4 py-0.5 bg-forest-50 dark:bg-forest-900/20 text-xs text-forest-700 dark:text-forest-300">
          {weatherLabel(weather.current.weatherCode)}
        </div>
      )}

      {/* 7-day forecast */}
      {weather && (
        <div className="border-b border-border">
          <div className="px-3 pt-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Forecast</span>
          </div>
          <div className="flex items-stretch">
            {weather.daily.map((day, i) => (
              <div
                key={i}
                className={`flex-1 flex flex-col items-center py-1.5 ${
                  i === 0 ? 'bg-forest-50/50 dark:bg-forest-900/15' : ''
                } ${i < weather.daily.length - 1 ? 'border-r border-border/40' : ''}`}
              >
                <span className={`text-[11px] font-medium leading-none ${
                  i === 0 ? 'text-forest-700 dark:text-forest-300' : 'text-text-tertiary'
                }`}>{day.day}</span>
                <span className="text-sm leading-none my-0.5">{weatherIcon(day.weatherCode)}</span>
                <span className="text-[11px] leading-none tabular-nums">
                  <span className="font-semibold text-foreground">{day.tempMax}&deg;</span>
                  <span className="text-text-tertiary"> {day.tempMin}&deg;</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="px-3 py-2 flex items-center gap-3 border-b border-border/50">
        <div className="flex flex-col">
          <span className="text-[11px] text-text-tertiary leading-none mb-0.5">Hives</span>
          <span className="text-sm font-bold text-foreground tabular-nums">{apiary.hiveCount}</span>
        </div>
        <div className="w-px h-5 bg-border" />
        <div className="flex flex-col">
          <span className="text-[11px] text-text-tertiary leading-none mb-0.5">Last Inspected</span>
          {daysSinceInspection !== null ? (
            <span className={`text-sm font-bold tabular-nums ${
              daysSinceInspection < 7
                ? 'text-green-700 dark:text-green-400'
                : daysSinceInspection < 14
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-red-700 dark:text-red-400'
            }`}>{daysSinceInspection}d ago</span>
          ) : apiary.hiveCount > 0 ? (
            <span className="text-sm font-medium text-text-tertiary">Never</span>
          ) : (
            <span className="text-sm font-medium text-text-tertiary">&mdash;</span>
          )}
        </div>
      </div>

      {/* Scale weight row */}
      {hasScales && (
        <div className="px-3 py-2 flex items-center gap-2">
          <div className="flex items-center gap-1 shrink-0">
            <Scale size={12} className="text-text-tertiary" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
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
  const valid = values.filter((v): v is number => v !== null)
  if (valid.length === 0) return null
  return valid.reduce((sum, v) => sum + v, 0) / valid.length
}
