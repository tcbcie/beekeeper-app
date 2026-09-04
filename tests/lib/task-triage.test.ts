import { describe, it, expect } from 'vitest'
import {
  matchesTaskView, isBatchMilestone, compareTaskUrgency, dueLabel, isTaskView, taskDateBounds,
} from '@/lib/task-triage'

const row = (o: Partial<any>) => ({
  completed: false, start_date: '2026-09-04', priority: 'normal',
  event_type: 'task', batch_id: null, ...o,
})
const today = '2026-09-04'
const weekEnd = '2026-09-11'

describe('task triage', () => {
  it('places rows in exactly one date preset', () => {
    const rows = [
      row({ start_date: '2026-05-06' }),          // long overdue
      row({ start_date: today }),                  // today
      row({ start_date: '2026-09-09' }),           // this week
      row({ start_date: '2026-11-01' }),           // later
      row({ start_date: '2026-05-06', completed: true }), // done
    ]
    const buckets = rows.map(r =>
      (['due','week','later','done'] as const).filter(v => matchesTaskView(r, v, today, weekEnd)))
    expect(buckets).toEqual([['due'], ['due'], ['week'], ['later'], ['done']])
    // 'all' always matches
    expect(rows.every(r => matchesTaskView(r, 'all', today, weekEnd))).toBe(true)
  })

  it('boundaries: today is due now, today+7 is this week, today+8 is later', () => {
    expect(matchesTaskView(row({ start_date: today }), 'due', today, weekEnd)).toBe(true)
    expect(matchesTaskView(row({ start_date: weekEnd }), 'week', today, weekEnd)).toBe(true)
    expect(matchesTaskView(row({ start_date: '2026-09-12' }), 'later', today, weekEnd)).toBe(true)
  })

  it('identifies batch milestones by the FK, not the title', () => {
    expect(isBatchMilestone(row({ event_type: 'event', batch_id: 'b1' }))).toBe(true)
    expect(isBatchMilestone(row({ event_type: 'task', batch_id: 'b1' }))).toBe(false)
    expect(isBatchMilestone(row({ event_type: 'event', batch_id: null }))).toBe(false)
  })

  it('sorts nearest first, then most urgent within a day', () => {
    const sorted = [
      row({ start_date: '2026-09-05', priority: 'urgent' }),
      row({ start_date: '2026-09-04', priority: 'low' }),
      row({ start_date: '2026-09-04', priority: 'urgent' }),
      row({ start_date: '2026-09-04', priority: 'high' }),
    ].sort(compareTaskUrgency)
    expect(sorted.map(r => `${r.start_date}/${r.priority}`)).toEqual([
      '2026-09-04/urgent', '2026-09-04/high', '2026-09-04/low', '2026-09-05/urgent',
    ])
  })

  it('labels lateness, and says nothing for future or completed rows', () => {
    expect(dueLabel(row({ start_date: '2026-08-23' }), today)).toBe('Overdue — 12 days')
    expect(dueLabel(row({ start_date: '2026-09-03' }), today)).toBe('Overdue — 1 day')
    expect(dueLabel(row({ start_date: today }), today)).toBe('Today')
    expect(dueLabel(row({ start_date: '2026-09-20' }), today)).toBeNull()
    expect(dueLabel(row({ start_date: '2026-08-23', completed: true }), today)).toBeNull()
  })

  it('rejects a stale persisted preset by membership, not type', () => {
    expect(isTaskView('due')).toBe(true)
    expect(isTaskView('active')).toBe(false)   // the retired tasks:status value
    expect(isTaskView(null)).toBe(false)
  })

  it('spans exactly seven days', () => {
    const { today: t, weekEnd: w } = taskDateBounds(new Date('2026-09-04T10:00:00'))
    expect(t).toBe('2026-09-04')
    expect(w).toBe('2026-09-11')
  })
})
