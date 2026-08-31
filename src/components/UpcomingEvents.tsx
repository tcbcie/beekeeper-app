'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { differenceInCalendarDays, formatLocalDate, parseLocalDate, toLocalDateString } from '@/lib/date-utils'
import { Calendar, Bell } from 'lucide-react'
import Link from 'next/link'
import Panel from '@/components/ui/Panel'

interface UpcomingEvent {
  id: string
  title: string
  date: string
  event_type: 'task' | 'event' | 'reminder'
  days_until: number
  category?: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  batch_id?: string
  hive_id?: string
  apiary_id?: string
  apiary_name?: string
}

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 }

export default function UpcomingEvents({ userId }: { userId: string }) {
  const [events, setEvents] = useState<UpcomingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchUpcomingEvents = useCallback(async () => {
    if (!userId) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sevenDaysFromNow = new Date(today)
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    const todayString = toLocalDateString(today)
    const sevenDaysString = toLocalDateString(sevenDaysFromNow)

    // Fetch all tasks and events from tasks_events table
    const { data: tasks, error } = await supabase
      .from('tasks_events')
      .select('id, title, event_type, category, priority, start_date, batch_id, hive_id, apiary_id, completed, apiaries(name)')
      .eq('user_id', userId)
      .eq('completed', false)
      .gte('start_date', todayString)
      .lte('start_date', sevenDaysString)
      .order('start_date', { ascending: true })

    if (error) {
      console.error('Error fetching events:', error)
      setError(true)
      setLoading(false)
      return
    }

    const upcomingEvents: UpcomingEvent[] = (tasks || []).map(task => {
      const eventDate = parseLocalDate(task.start_date)
      const daysUntil = differenceInCalendarDays(today, eventDate)

      return {
        id: task.id,
        title: task.title,
        date: task.start_date,
        event_type: task.event_type as 'task' | 'event' | 'reminder',
        days_until: daysUntil,
        category: task.category || undefined,
        priority: task.priority || undefined,
        batch_id: task.batch_id || undefined,
        hive_id: task.hive_id || undefined,
        apiary_id: task.apiary_id || undefined,
        apiary_name: (task.apiaries as { name: string }[] | null)?.[0]?.name || undefined
      }
    })

    // Sort by days until (soonest first), then by priority
    upcomingEvents.sort((a, b) => {
      if (a.days_until !== b.days_until) {
        return a.days_until - b.days_until
      }
      // If same day, prioritise by priority (urgent > high > normal > low)
      const aPriority = a.priority ? PRIORITY_ORDER[a.priority] : 999
      const bPriority = b.priority ? PRIORITY_ORDER[b.priority] : 999
      return aPriority - bPriority
    })

    setEvents(upcomingEvents)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchUpcomingEvents()
  }, [fetchUpcomingEvents])

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'task': return 'Task'
      case 'event': return 'Event'
      case 'reminder': return 'Reminder'
      default: return type
    }
  }

  const getCategoryLabel = (category: string | undefined) => {
    if (!category) return ''
    return category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const getPriorityColor = (priority: string | undefined) => {
    if (!priority) return ''
    switch (priority) {
      case 'urgent': return 'text-red-600 dark:text-red-400'
      case 'high': return 'text-orange-600 dark:text-orange-400'
      case 'normal': return 'text-blue-600 dark:text-blue-400'
      case 'low': return 'text-text-secondary'
      default: return ''
    }
  }

  const getBadgeColor = (daysUntil: number) => {
    if (daysUntil === 1) return 'bg-orange-100 dark:bg-orange-950/30 text-foreground dark:text-orange-300 border-orange-200 dark:border-orange-800'
    if (daysUntil <= 3) return 'bg-yellow-100 dark:bg-yellow-950/30 text-foreground dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
    return 'bg-blue-100 dark:bg-blue-950/30 text-foreground dark:text-blue-300 border-blue-200 dark:border-blue-800'
  }

  const formatDate = (dateString: string) => {
    return formatLocalDate(dateString)
  }

  const buildEventHref = (eventId: string) => {
    const params = new URLSearchParams({ task: eventId })
    return `/dashboard/tasks?${params.toString()}`
  }

  if (loading) {
    return (
      <Panel>
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={20} className="text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold text-foreground">Upcoming Events</h2>
        </div>
        <p className="text-text-secondary text-sm">Loading...</p>
      </Panel>
    )
  }

  if (error) {
    return null
  }

  // Filter out today's events (already shown in attention banner)
  const futureEvents = events.filter(e => e.days_until > 0)

  // Hide entirely when no upcoming events
  if (futureEvents.length === 0) {
    return null
  }

  return (
    <Panel>
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={20} className="text-blue-600 dark:text-blue-400" />
        <h2 className="text-lg font-semibold text-foreground">Upcoming Events</h2>
        <span className="ml-auto text-sm text-text-tertiary">Next 7 days</span>
      </div>

      <div className="space-y-3">
        {futureEvents.map((event, index) => (
          <Link
            key={`${event.id}-${index}`}
            href={buildEventHref(event.id)}
            className="block p-3 rounded-lg border border-border hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Bell size={14} className="text-text-tertiary flex-shrink-0" />
                  <p className={`font-medium text-sm truncate ${event.priority ? getPriorityColor(event.priority) : 'text-foreground'}`}>
                    {event.title}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm text-text-secondary">{getEventLabel(event.event_type)}</p>
                  {event.category && (
                    <span className="text-sm text-text-tertiary">• {getCategoryLabel(event.category)}</span>
                  )}
                </div>
                {event.apiary_name && (
                  <p className="text-sm text-text-tertiary mt-0.5">{event.apiary_name}</p>
                )}
                <p className="text-sm text-text-tertiary mt-0.5">{formatDate(event.date)}</p>
              </div>
              <span className={`px-2 py-1 rounded text-sm font-medium border ${getBadgeColor(event.days_until)} whitespace-nowrap`}>
                {event.days_until === 1 ? 'Tomorrow' : `${event.days_until} days`}
              </span>
            </div>
          </Link>
        ))}
        <Link href="/dashboard/tasks" className="block text-center text-sm text-forest-600 dark:text-forest-400 hover:underline pt-2">
          View All Tasks
        </Link>
      </div>
    </Panel>
  )
}
