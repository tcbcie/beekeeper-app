'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import Panel from '@/components/ui/Panel'
import Button from '@/components/ui/Button'
import { buildApiaryTodos, isVisitSeason } from '@/lib/dashboard-todo'
import type { TodoItem, TodoTone } from '@/lib/dashboard-todo'
import type { DashboardApiary, DashboardScaleSummary } from '@/types/dashboard'

interface TodoListProps {
  /** Apiaries in the order to visit them (nearest first when GPS is available) */
  apiaries: DashboardApiary[]
  /** Account-wide: active queens over two years old */
  oldQueens: number
  /** Scale summaries by apiary id, for the scale alerts (empty until they load) */
  scalesByApiary: Record<string, DashboardScaleSummary[]>
}

const VISIBLE_WHEN_COLLAPSED = 5

const DOT: Record<TodoTone, string> = {
  red: 'bg-red-600 dark:bg-red-400',
  amber: 'bg-amber-500 dark:bg-amber-400',
  blue: 'bg-blue-600 dark:bg-blue-400',
}

/** A job's start button: names the job for screen readers */
export function TodoActionLink({ label, href, title }: { label: string; href: string; title: string }) {
  return (
    <Link
      href={href}
      aria-label={`${label}: ${title}`}
      className="inline-flex min-h-12 shrink-0 items-center rounded-lg border border-forest-700 px-3 text-sm font-semibold text-forest-800 hover:bg-forest-50 dark:border-forest-400 dark:text-forest-300 dark:hover:bg-forest-900/30"
    >
      {label}
    </Link>
  )
}

/** One job: colour dot, title, where it comes from and why, and its button */
export function TodoRow({ item, action }: { item: Pick<TodoItem, 'kind' | 'tone' | 'title' | 'detail'>; action: ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[item.tone]}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-foreground break-words">{item.title}</p>
        <p className="text-sm text-text-secondary"><span className="font-semibold">{item.kind}</span> · {item.detail}</p>
      </div>
      {action}
    </li>
  )
}

interface TodoGroup {
  key: string
  heading: string
  items: TodoItem[]
}

/** One list of jobs, grouped by apiary, each with a button that starts it. */
export default function TodoList({ apiaries, oldQueens, scalesByApiary }: TodoListProps) {
  const [showAll, setShowAll] = useState(false)

  // The same lists as each apiary row's "N jobs" pill, so the count here is the pills added up
  const groups = useMemo<TodoGroup[]>(() => (
    apiaries
      .map(apiary => ({
        key: apiary.id,
        heading: apiary.name,
        items: buildApiaryTodos(apiary, scalesByApiary[apiary.id]),
      }))
      .filter(group => group.items.length > 0)
  ), [apiaries, scalesByApiary])

  const total = groups.reduce((sum, group) => sum + group.items.length, 0)

  // Collapsed: the first five jobs, groups in order, so the nearest apiary's jobs come first
  const shown = useMemo(() => {
    if (showAll) return groups
    let left = VISIBLE_WHEN_COLLAPSED
    const out: TodoGroup[] = []
    for (const group of groups) {
      if (left <= 0) break
      out.push({ ...group, items: group.items.slice(0, left) })
      left -= group.items.length
    }
    return out
  }, [groups, showAll])

  return (
    <Panel padding="md">
      <h2 className="text-lg font-semibold text-foreground">
        To do{total > 0 && <span className="font-normal text-text-secondary"> · {total} {total === 1 ? 'job' : 'jobs'}</span>}
      </h2>

      {total === 0 ? (
        <p className="mt-2 flex items-center gap-2 text-base text-green-800 dark:text-green-300">
          <CheckCircle size={18} aria-hidden="true" />
          {isVisitSeason()
            ? 'Nothing urgent: every apiary visited in the last 14 days and no tasks due.'
            : 'Nothing urgent: no tasks due.'}
        </p>
      ) : (
        <div className="mt-1">
          {shown.map(group => (
            <section key={group.key} aria-label={group.heading}>
              <div className="mt-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-text-secondary">{group.heading}</h3>
                <Link
                  href={`/dashboard/apiaries/${group.key}`}
                  aria-label={`Plan visit: ${group.heading}`}
                  className="inline-flex min-h-12 shrink-0 items-center text-sm font-semibold text-forest-800 underline dark:text-forest-300"
                >
                  Plan visit
                </Link>
              </div>
              <ul className="divide-y divide-border">
                {group.items.map(item => (
                  <TodoRow
                    key={item.key}
                    item={item}
                    action={<TodoActionLink label={item.action.label} href={item.action.href} title={item.title} />}
                  />
                ))}
              </ul>
            </section>
          ))}
          {total > VISIBLE_WHEN_COLLAPSED && (
            <Button tone="neutral" size="sm" className="mt-3" onClick={() => setShowAll(v => !v)} aria-expanded={showAll}>
              {showAll ? 'Show fewer' : `Show all ${total} jobs`}
            </Button>
          )}
        </div>
      )}

      {/* Advice for next season, not a job, so it is not counted */}
      {oldQueens > 0 && (
        <p className="mt-3 border-t border-border pt-3 text-sm text-text-secondary">
          {oldQueens} {oldQueens === 1 ? 'queen is' : 'queens are'} over 2 years old, consider requeening next season.{' '}
          <Link href="/dashboard/queens" className="inline-flex min-h-12 items-center font-semibold text-forest-800 underline dark:text-forest-300">Queens</Link>
        </p>
      )}
    </Panel>
  )
}
