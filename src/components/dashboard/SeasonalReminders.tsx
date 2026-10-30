'use client'

import { useEffect, useState } from 'react'
import Panel from '@/components/ui/Panel'
import { supabase } from '@/lib/supabase'
import type { DashboardScaleSummary } from '@/types/dashboard'

// One month's list per page load: it rarely changes. A failure or an empty answer is not kept, so
// the next visit tries again.
const tasksCache = new Map<number, string[]>()

// Months (1–12) whose reminders are about stores, so the user's scales answer them:
// September to February, and June (the June gap). Agreed with the owner, 29 October 2026.
const STORES_MONTHS = [9, 10, 11, 12, 1, 2, 6]

interface SeasonalRemindersProps {
  /** Every scale summary on the dashboard (useScaleSummaries); empty until they load */
  scales: DashboardScaleSummary[]
}

/**
 * This month's jobs, e.g. "October in Ireland" (monthly_apiary_tasks: at most 5 a month), with the
 * user's scales in stores months.
 */
export default function SeasonalReminders({ scales }: SeasonalRemindersProps) {
  const now = new Date()
  const month = now.toLocaleDateString('en-IE', { month: 'long' })
  const monthNumber = now.getMonth() + 1
  const [tasks, setTasks] = useState<string[]>(() => tasksCache.get(monthNumber) ?? [])

  useEffect(() => {
    if (tasksCache.has(monthNumber)) return
    let cancelled = false
    supabase
      .from('monthly_apiary_tasks')
      .select('task')
      .eq('month', monthNumber)
      .order('position')
      .then(({ data, error }) => {
        // Supplementary: on a failure the panel shows only what else it has
        if (error || !data) return
        const loaded = data.map(row => row.task as string)
        if (loaded.length > 0) tasksCache.set(monthNumber, loaded)
        if (!cancelled) setTasks(loaded)
      })
    return () => { cancelled = true }
  }, [monthNumber])

  // "34-DA -2.7 kg, 26-DA -2.1 kg, 29-DA +1.3 kg": lightest-going first
  const scaleLine = STORES_MONTHS.includes(monthNumber)
    ? scales
        .filter((s): s is DashboardScaleSummary & { change7d: number } => typeof s.change7d === 'number')
        .sort((a, b) => a.change7d - b.change7d)
        .map(s => `${s.hiveNumber ?? 'a hive'} ${s.change7d > 0 ? '+' : ''}${s.change7d.toFixed(1)} kg`)
        .join(', ')
    : ''

  if (tasks.length === 0 && !scaleLine) return null

  return (
    <Panel padding="md">
      <h2 className="text-lg font-semibold text-foreground">{month} in Ireland</h2>
      {tasks.length > 0 && (
        <ul className="mt-2 space-y-1.5 list-disc pl-5 text-base text-foreground">
          {tasks.map(text => <li key={text}>{text}</li>)}
        </ul>
      )}
      {scaleLine && (
        <div className="mt-3 border-t border-border pt-2">
          <h3 className="text-base font-semibold text-foreground">Your hives</h3>
          <p className="text-base text-text-secondary">Scales this week: {scaleLine}</p>
        </div>
      )}
    </Panel>
  )
}
