'use client'

import { useEffect, useState } from 'react'
import Panel from '@/components/ui/Panel'
import { supabase } from '@/lib/supabase'

// One month's list per page load: it rarely changes. A failure or an empty answer is not kept, so
// the next visit tries again.
const tasksCache = new Map<number, string[]>()

/** This month's jobs, e.g. "October in Ireland" (monthly_apiary_tasks: at most 5 a month). */
export default function SeasonalReminders() {
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
        // Supplementary: on a failure the panel simply stays away
        if (error || !data) return
        const loaded = data.map(row => row.task as string)
        if (loaded.length > 0) tasksCache.set(monthNumber, loaded)
        if (!cancelled) setTasks(loaded)
      })
    return () => { cancelled = true }
  }, [monthNumber])

  if (tasks.length === 0) return null

  return (
    <Panel padding="md">
      <h2 className="text-lg font-semibold text-foreground">{month} in Ireland</h2>
      <ul className="mt-2 space-y-1.5 list-disc pl-5 text-base text-foreground">
        {tasks.map(text => <li key={text}>{text}</li>)}
      </ul>
    </Panel>
  )
}
