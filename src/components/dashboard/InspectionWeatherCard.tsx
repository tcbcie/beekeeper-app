'use client'

import { useEffect, useState } from 'react'
import { Sun, CloudRain, Thermometer, Wind, Clock } from 'lucide-react'
import Panel from '@/components/ui/Panel'
import { getCurrentDate } from '@/lib/date-utils'
import { formatWindow, judgeDay, INSPECTION_RULE } from '@/lib/inspection-weather'
import type { DayVerdict, HourForecast, NoGoReason } from '@/lib/inspection-weather'

interface InspectionWeatherCardProps {
  latitude: number
  longitude: number
  apiaryName: string
}

// One hourly forecast per location, kept for 30 minutes; a failure is not kept, so the next visit retries
const CACHE_TTL_MS = 30 * 60 * 1000
const forecastCache = new Map<string, { hours: HourForecast[]; at: number }>()

async function fetchHourlyForecast(latitude: number, longitude: number): Promise<HourForecast[]> {
  const key = `${latitude},${longitude}`
  const cached = forecastCache.get(key)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.hours

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m&timezone=Europe/Dublin&forecast_days=5`,
      { signal: controller.signal }
    )
    if (!res.ok) throw new Error('Forecast request failed')
    const json = await res.json()
    const h = json?.hourly
    if (!h || !Array.isArray(h.time)) throw new Error('Unexpected forecast response')

    const hours: HourForecast[] = (h.time as string[]).map((time, i) => ({
      // Open-Meteo returns local times ("2026-10-29T10:00") because timezone=Europe/Dublin
      date: time.slice(0, 10),
      hour: Number(time.slice(11, 13)),
      temperature: Number(h.temperature_2m?.[i]),
      rainChance: Number(h.precipitation_probability?.[i] ?? 0),
      rain: Number(h.precipitation?.[i] ?? 0),
      wind: Number(h.wind_speed_10m?.[i] ?? 0),
    }))
      // An hour with a missing temperature would pass the 15°C test (NaN < 15 is false) and show
      // as good weather: drop it, along with any hour that did not parse
      .filter(hour => Number.isFinite(hour.temperature) && Number.isFinite(hour.hour) &&
        Number.isFinite(hour.rainChance) && Number.isFinite(hour.rain) && Number.isFinite(hour.wind))
    forecastCache.set(key, { hours, at: Date.now() })
    return hours
  } finally {
    clearTimeout(timer)
  }
}

const REASON_HEADLINE: Record<NoGoReason, string> = {
  cool: 'Not today: too cool',
  rain: 'Not today: rain expected',
  wind: 'Not today: too windy',
  late: 'Too late today',
}

const REASON_SHORT: Record<NoGoReason, string> = { cool: 'cool', rain: 'rain', wind: 'windy', late: '–' }

const REASON_ICON: Record<NoGoReason, typeof Sun> = { cool: Thermometer, rain: CloudRain, wind: Wind, late: Clock }

const isGoodDay = (d: DayVerdict) => d.window !== null && d.window.end - d.window.start >= 2

function weekdayName(date: string, style: 'short' | 'long'): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-IE', { weekday: style })
}

export default function InspectionWeatherCard({ latitude, longitude, apiaryName }: InspectionWeatherCardProps) {
  const [days, setDays] = useState<DayVerdict[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchHourlyForecast(latitude, longitude)
      .then(hours => {
        if (cancelled) return
        const today = getCurrentDate()
        const dates = Array.from(new Set(hours.map(h => h.date))).filter(d => d >= today).slice(0, 5)
        const nowHour = new Date().getHours()
        setDays(dates.map(date => judgeDay(date, hours, date === today ? nowHour : INSPECTION_RULE.firstHour)))
        setFailed(false)
      })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [latitude, longitude])

  if (failed) {
    return (
      <Panel padding="md">
        <h2 className="text-lg font-semibold text-foreground">Can I open my hives today?</h2>
        <p className="mt-1 text-sm text-text-secondary">The forecast is not available right now.</p>
      </Panel>
    )
  }

  if (!days || days.length === 0) {
    return (
      <Panel padding="md">
        <h2 className="text-lg font-semibold text-foreground">Can I open my hives today?</h2>
        <div className="mt-3 h-12 rounded-lg bg-surface-secondary animate-shimmer" />
      </Panel>
    )
  }

  const [today, ...later] = days
  const todayGood = today.window !== null
  const nextGood = isGoodDay(today) ? null : later.find(isGoodDay) ?? null
  const Icon = todayGood ? Sun : REASON_ICON[today.reason ?? 'cool']

  const headline = todayGood
    ? (isGoodDay(today) ? `Yes, ${formatWindow(today.window!)}` : `Only briefly, ${formatWindow(today.window!)}`)
    : REASON_HEADLINE[today.reason ?? 'cool']
  const explanation = today.reason === 'late'
    ? 'Hives are best opened between 10:00 and 17:00.'
    : todayGood
      ? `Up to ${today.maxTemperature}°C, dry and calm.`
      : `${today.maxTemperature !== null ? `Up to ${today.maxTemperature}°C. ` : ''}Bees want ${INSPECTION_RULE.minTemperature}°C or more, dry and calm.`

  return (
    <Panel padding="md">
      <h2 className="text-lg font-semibold text-foreground">Can I open my hives today?</h2>

      <div className="mt-3 flex items-center gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
          todayGood ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
        }`}>
          <Icon size={24} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-foreground">{headline}</p>
          <p className="text-sm text-text-secondary">{explanation}</p>
        </div>
      </div>

      <ul className="mt-4 grid grid-cols-5 gap-1.5 text-center" aria-label="Inspection weather, next five days">
        {days.map((day, i) => {
          const good = isGoodDay(day)
          const brief = day.window !== null && !good
          const label = i === 0 ? 'Today' : weekdayName(day.date, 'short')
          const detail = day.window
            ? `${day.window.start}–${day.window.end}`
            : REASON_SHORT[day.reason ?? 'cool']
          const spoken = day.window
            ? `${i === 0 ? 'Today' : weekdayName(day.date, 'long')}: good from ${formatWindow(day.window)}`
            : `${i === 0 ? 'Today' : weekdayName(day.date, 'long')}: not suitable (${REASON_SHORT[day.reason ?? 'cool']})`
          return (
            <li
              key={day.date}
              aria-label={spoken}
              className={`rounded-lg px-1 py-1.5 text-sm ${
                good
                  ? 'bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200'
                  : brief
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
                    : 'bg-surface-secondary text-text-secondary'
              }`}
            >
              <span className="block font-semibold">{label}</span>
              <span className="block tabular-nums">{day.maxTemperature !== null ? `${day.maxTemperature}°` : '–'}</span>
              <span className="block tabular-nums">{detail}</span>
            </li>
          )
        })}
      </ul>

      <p className="mt-3 text-sm text-text-secondary">
        {isGoodDay(today)
          ? null
          : nextGood
            ? <>Next good window: <span className="font-semibold text-foreground">{weekdayName(nextGood.date, 'long')} {formatWindow(nextGood.window!)}</span>. </>
            : 'No good window in the next five days. '}
        Forecast for {apiaryName}.
      </p>
    </Panel>
  )
}
