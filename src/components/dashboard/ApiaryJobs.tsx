'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import Panel from '@/components/ui/Panel'
import { useToast } from '@/components/ui/Toast'
import { TodoActionLink, TodoRow } from '@/components/dashboard/TodoList'
import { useApiaryJobs } from '@/hooks/useApiaryJobs'
import type { ApiaryTask } from '@/hooks/useApiaryJobs'
import { useInspectionForecast } from '@/hooks/useInspectionForecast'
import { useScaleSummaries } from '@/hooks/useScaleSummaries'
import { useSubmitLock } from '@/hooks/useSubmitLock'
import { buildApiaryTodos, formatDayMonth } from '@/lib/dashboard-todo'
import { getCurrentDate } from '@/lib/date-utils'
import { formatWindow, isGoodDay, weekdayName } from '@/lib/inspection-weather'
import type { DayVerdict } from '@/lib/inspection-weather'
import { seasonShowsForecast } from '@/lib/seasonal-lead'
import { getSeason } from '@/lib/seasons'
import { supabase } from '@/lib/supabase'

function dueText(date: string): string {
  const today = getCurrentDate()
  if (date === today) return 'due today'
  const day = formatDayMonth(date) ?? date
  return date < today ? `was due ${day}` : `due ${day}`
}

function visitWindowText(days: DayVerdict[]): string {
  const [today, ...later] = days
  if (today && isGoodDay(today)) return `Today may suit a visit, ${formatWindow(today.window!)}`
  const next = later.find(isGoodDay)
  return next
    ? `${weekdayName(next.date, 'long')} may suit a visit, ${formatWindow(next.window!)}`
    : 'No good day for a visit in the next five days'
}

function TaskRow({ task, onDone }: { task: ApiaryTask; onDone: (taskId: string) => void }) {
  const toast = useToast()
  const { submitting, run } = useSubmitLock()

  const markDone = () => run(async () => {
    // A task someone else owns is blocked by RLS with no error, only no rows
    const { data, error } = await supabase
      .from('tasks_events')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', task.id)
      .select('id')
    if (error || !data || data.length === 0) {
      toast.error('This task could not be marked done.')
      return
    }
    onDone(task.id)
    toast.success(`Done: ${task.title}`)
  })

  const item = { key: task.id, kind: 'Task' as const, tone: 'blue' as const, title: task.title, detail: dueText(task.start_date) }

  // A removal task closes when the removal is recorded: ticking it alone would leave the hive
  // showing as still under treatment
  const action = task.treatment_id && task.hive_id ? (
    <TodoActionLink
      label="Open"
      href={`/dashboard/records?hive=${task.hive_id}&type=varroa-treatment&record=${task.treatment_id}`}
      title={task.title}
    />
  ) : (
    <Button
      type="button"
      tone="neutral"
      size="sm"
      className="min-h-12 shrink-0"
      disabled={submitting}
      onClick={markDone}
      aria-label={`Mark done: ${task.title}`}
    >
      Done
    </Button>
  )

  return <TodoRow item={item} action={action} />
}

interface ApiaryJobsProps {
  apiaryId: string
  latitude: number | null
  longitude: number | null
}

/** The visit plan at the top of the apiary page: what needs doing here, and when a visit may suit. */
export default function ApiaryJobs({ apiaryId, latitude, longitude }: ApiaryJobsProps) {
  const { overview, tasks, loading, failed, removeTask } = useApiaryJobs(apiaryId)
  const overviewList = useMemo(() => (overview ? [overview] : []), [overview])
  const { scalesByApiary } = useScaleSummaries(overviewList)

  const forecastSeason = seasonShowsForecast(getSeason())
  const { days, checkedAt } = useInspectionForecast(latitude, longitude, forecastSeason)

  // Tasks are listed one by one below, in place of the summary line the dashboard shows
  const recordJobs = useMemo(
    () => (overview ? buildApiaryTodos(overview, scalesByApiary[apiaryId]).filter(item => item.kind !== 'Task') : []),
    [overview, scalesByApiary, apiaryId]
  )

  const isEmpty = recordJobs.length === 0 && tasks.length === 0

  return (
    <Panel padding="md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">Jobs here</h2>
        <Link
          href={`/dashboard/tasks?apiary=${apiaryId}&checklist=true`}
          className="inline-flex min-h-12 items-center rounded-lg border border-forest-700 px-3 text-sm font-semibold text-forest-800 hover:bg-forest-50 dark:border-forest-400 dark:text-forest-300 dark:hover:bg-forest-900/30"
        >
          Visit checklist
        </Link>
      </div>

      {days && days.length > 0 && (
        <p className="mt-1 text-sm text-text-secondary">
          {visitWindowText(days)}.
          {checkedAt !== null && ` Forecast checked ${new Date(checkedAt).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}; check local conditions too.`}
        </p>
      )}

      {loading ? (
        <p className="mt-2 text-base text-text-secondary">Loading jobs…</p>
      ) : (
        <>
          {failed && <p className="mt-2 text-base text-red-800 dark:text-red-300">Some jobs could not be loaded, so this list may be incomplete.</p>}
          {isEmpty && !failed && (
            <p className="mt-2 flex items-center gap-2 text-base text-green-800 dark:text-green-300">
              <CheckCircle size={18} aria-hidden="true" />
              Nothing to do here: no open tasks or recorded concerns.
            </p>
          )}
          {!isEmpty && (
            <ul className="mt-1 divide-y divide-border">
              {recordJobs.map(item => (
                <TodoRow
                  key={item.key}
                  item={item}
                  action={<TodoActionLink label={item.action.label} href={item.action.href} title={item.title} />}
                />
              ))}
              {tasks.map(task => <TaskRow key={task.id} task={task} onDone={removeTask} />)}
            </ul>
          )}
        </>
      )}
    </Panel>
  )
}
