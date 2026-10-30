'use client'

import { useEffect, useState } from 'react'
import Panel from '@/components/ui/Panel'
import { supabase } from '@/lib/supabase'

interface MonthList {
  tasks: string[]
  /** "October 2026": when the list was last changed */
  reviewed: string | null
}

// One month's list per page load: it rarely changes. A failure or an empty answer is not kept, so
// the next visit tries again.
const listCache = new Map<number, MonthList>()

/** After an admin edits a month, so the dashboard in the same session shows the change */
export function clearMonthlyTasksCache(month: number) {
  listCache.delete(month)
}

const EMPTY_LIST: MonthList = { tasks: [], reviewed: null }

/** This month's jobs, e.g. "October in Ireland" (monthly_apiary_tasks: at most 5 a month). */
export default function SeasonalReminders() {
  const now = new Date()
  const month = now.toLocaleDateString('en-IE', { month: 'long' })
  const monthNumber = now.getMonth() + 1
  const [list, setList] = useState<MonthList>(() => listCache.get(monthNumber) ?? EMPTY_LIST)

  useEffect(() => {
    if (listCache.has(monthNumber)) return
    let cancelled = false
    supabase
      .from('monthly_apiary_tasks')
      .select('task, updated_at')
      .eq('month', monthNumber)
      .order('position')
      .then(({ data, error }) => {
        // Supplementary: on a failure the panel simply stays away
        if (error || !data) return
        const latest = data.reduce<string>((max, row) => (row.updated_at > max ? row.updated_at : max), '')
        const loaded: MonthList = {
          tasks: data.map(row => row.task as string),
          reviewed: latest ? new Date(latest).toLocaleDateString('en-IE', { month: 'long', year: 'numeric' }) : null,
        }
        if (loaded.tasks.length > 0) listCache.set(monthNumber, loaded)
        if (!cancelled) setList(loaded)
      })
    return () => { cancelled = true }
  }, [monthNumber])

  if (list.tasks.length === 0) return null

  return (
    <Panel padding="md">
      <h2 className="text-lg font-semibold text-foreground">{month} in Ireland</h2>
      <ul className="mt-2 space-y-1.5 list-disc pl-5 text-base text-foreground">
        {/* By position: an admin can now enter the same text twice */}
        {list.tasks.map((text, index) => <li key={index}>{text}</li>)}
      </ul>
      <p className="mt-3 text-sm text-text-secondary">
        General guidance from Tribes and beekeeping association calendars.{list.reviewed && ` Reviewed ${list.reviewed}.`}
      </p>
    </Panel>
  )
}
