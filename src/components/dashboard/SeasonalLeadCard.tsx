'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import Panel from '@/components/ui/Panel'
import { useInspectionForecast } from '@/hooks/useInspectionForecast'
import { formatWindow, isGoodDay, weekdayName } from '@/lib/inspection-weather'
import type { DayVerdict, NoGoReason } from '@/lib/inspection-weather'
import { buildSeasonalLead, seasonShowsForecast } from '@/lib/seasonal-lead'
import { getSeason } from '@/lib/seasons'
import type { DashboardApiary, DashboardScaleSummary } from '@/types/dashboard'

interface SeasonalLeadCardProps {
  /** Apiaries with hives, in the order to visit them */
  apiaries: DashboardApiary[]
  scales: DashboardScaleSummary[]
  scalesLoading: boolean
  /** Nearest apiary with coordinates, for the forecast */
  forecastApiary: DashboardApiary | null
}

const REASON_SHORT: Record<NoGoReason, string> = { cool: 'cool', rain: 'rain', wind: 'windy', late: '–' }

const PILL = {
  amber: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
  green: 'bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200',
}

function DayTiles({ days, apiaryName }: { days: DayVerdict[]; apiaryName: string }) {
  return (
    <div>
      <ul className="grid grid-cols-5 gap-1.5 text-center" aria-label="Inspection weather, next five days">
        {days.map((day, i) => {
          const good = isGoodDay(day)
          const name = i === 0 ? 'Today' : weekdayName(day.date, 'short')
          const spokenName = i === 0 ? 'Today' : weekdayName(day.date, 'long')
          return (
            <li
              key={day.date}
              aria-label={day.window ? `${spokenName}: good from ${formatWindow(day.window)}` : `${spokenName}: not suitable (${REASON_SHORT[day.reason ?? 'cool']})`}
              className={`rounded-lg px-1 py-1.5 text-sm ${
                good
                  ? 'bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200'
                  : day.window
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
                    : 'bg-surface-secondary text-text-secondary'
              }`}
            >
              <span className="block font-semibold">{name}</span>
              <span className="block tabular-nums">{day.maxTemperature !== null ? `${day.maxTemperature}°` : '–'}</span>
              <span className="block tabular-nums">{day.window ? `${day.window.start}–${day.window.end}` : REASON_SHORT[day.reason ?? 'cool']}</span>
            </li>
          )
        })}
      </ul>
      <p className="mt-1.5 text-sm text-text-secondary">Good hours are 15°C or more, dry and calm. Forecast for {apiaryName}.</p>
    </div>
  )
}

/** The first thing on the dashboard: this season's one question, answered from the user's records. */
export default function SeasonalLeadCard({ apiaries, scales, scalesLoading, forecastApiary }: SeasonalLeadCardProps) {
  const showForecast = seasonShowsForecast(getSeason())
  const forecast = useInspectionForecast(forecastApiary?.latitude ?? null, forecastApiary?.longitude ?? null, showForecast)
  const { days, failed } = forecast

  const lead = useMemo(
    () => buildSeasonalLead({ apiaries, scales, scalesLoading, forecast: { days, failed } }),
    [apiaries, scales, scalesLoading, days, failed]
  )

  return (
    <Panel padding="none" className="overflow-hidden">
      <div className="bg-forest-800 px-4 py-3.5 text-white">
        <p className="text-sm text-forest-100">{lead.band}</p>
        <h2 className="mt-0.5 text-xl font-semibold leading-snug">{lead.question}</h2>
      </div>
      <div className="flex flex-col gap-3 px-4 py-3.5">
        <p className="text-lg font-bold leading-snug text-foreground">{lead.answer}</p>
        {lead.showForecast && days && days.length > 0 && forecastApiary && (
          <DayTiles days={days} apiaryName={forecastApiary.name} />
        )}
        {lead.rows.length > 0 && (
          <ul>
            {lead.rows.map(row => (
              <li key={row.key} className="flex items-center justify-between gap-3 border-t border-border py-2.5">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-foreground break-words">{row.title}</p>
                  <p className="text-sm text-text-secondary">{row.note}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-semibold ${PILL[row.tone]}`}>{row.pill}</span>
              </li>
            ))}
          </ul>
        )}
        {lead.action && (
          <Link
            href={lead.action.href}
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-forest-800 px-4 text-base font-semibold text-white hover:bg-forest-700"
          >
            {lead.action.label}
          </Link>
        )}
      </div>
    </Panel>
  )
}
