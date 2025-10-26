'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, Bell } from 'lucide-react'
import Link from 'next/link'

interface UpcomingEvent {
  id: string
  batch_name: string
  date: string
  date_type: 'acceptance_check' | 'first_cage' | 'second_cage' | 'hatch'
  days_until: number
}

export default function UpcomingEvents({ userId }: { userId: string }) {
  const [events, setEvents] = useState<UpcomingEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUpcomingEvents()
  }, [userId])

  const fetchUpcomingEvents = async () => {
    if (!userId) return

    const { data: batches } = await supabase
      .from('rearing_batches')
      .select('id, batch_name, acceptance_check_date, first_option_to_cage_date, second_option_to_cage_date, emergence_date')
      .eq('user_id', userId)
      .order('graft_date', { ascending: false })

    if (!batches) {
      setLoading(false)
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sevenDaysFromNow = new Date(today)
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

    const upcomingEvents: UpcomingEvent[] = []

    batches.forEach(batch => {
      // Check acceptance date
      if (batch.acceptance_check_date) {
        const eventDate = new Date(batch.acceptance_check_date)
        eventDate.setHours(0, 0, 0, 0)
        if (eventDate >= today && eventDate <= sevenDaysFromNow) {
          const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          upcomingEvents.push({
            id: batch.id,
            batch_name: batch.batch_name,
            date: batch.acceptance_check_date,
            date_type: 'acceptance_check',
            days_until: daysUntil
          })
        }
      }

      // Check first cage date
      if (batch.first_option_to_cage_date) {
        const eventDate = new Date(batch.first_option_to_cage_date)
        eventDate.setHours(0, 0, 0, 0)
        if (eventDate >= today && eventDate <= sevenDaysFromNow) {
          const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          upcomingEvents.push({
            id: batch.id,
            batch_name: batch.batch_name,
            date: batch.first_option_to_cage_date,
            date_type: 'first_cage',
            days_until: daysUntil
          })
        }
      }

      // Check second cage date
      if (batch.second_option_to_cage_date) {
        const eventDate = new Date(batch.second_option_to_cage_date)
        eventDate.setHours(0, 0, 0, 0)
        if (eventDate >= today && eventDate <= sevenDaysFromNow) {
          const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          upcomingEvents.push({
            id: batch.id,
            batch_name: batch.batch_name,
            date: batch.second_option_to_cage_date,
            date_type: 'second_cage',
            days_until: daysUntil
          })
        }
      }

      // Check hatch date
      if (batch.emergence_date) {
        const eventDate = new Date(batch.emergence_date)
        eventDate.setHours(0, 0, 0, 0)
        if (eventDate >= today && eventDate <= sevenDaysFromNow) {
          const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          upcomingEvents.push({
            id: batch.id,
            batch_name: batch.batch_name,
            date: batch.emergence_date,
            date_type: 'hatch',
            days_until: daysUntil
          })
        }
      }
    })

    // Sort by days until (soonest first)
    upcomingEvents.sort((a, b) => a.days_until - b.days_until)

    setEvents(upcomingEvents)
    setLoading(false)
  }

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'acceptance_check': return 'Acceptance Check'
      case 'first_cage': return '1st Cage Option'
      case 'second_cage': return '2nd Cage Option'
      case 'hatch': return 'Expected Hatch'
      default: return type
    }
  }

  const getBadgeColor = (daysUntil: number) => {
    if (daysUntil === 0) return 'bg-red-100 text-red-800 border-red-200'
    if (daysUntil === 1) return 'bg-orange-100 text-orange-800 border-orange-200'
    if (daysUntil <= 3) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-blue-100 text-blue-800 border-blue-200'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={20} className="text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
        </div>
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={20} className="text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
        </div>
        <p className="text-gray-500 text-sm">No events in the next 7 days</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={20} className="text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
        <span className="ml-auto text-xs text-gray-500">Next 7 days</span>
      </div>

      <div className="space-y-3">
        {events.map((event, index) => (
          <Link
            key={`${event.id}-${event.date_type}-${index}`}
            href="/dashboard/batches"
            className="block p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Bell size={14} className="text-gray-400 flex-shrink-0" />
                  <p className="font-medium text-gray-900 text-sm truncate">{event.batch_name}</p>
                </div>
                <p className="text-xs text-gray-600">{getEventLabel(event.date_type)}</p>
                <p className="text-xs text-gray-500 mt-0.5">{formatDate(event.date)}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium border ${getBadgeColor(event.days_until)} whitespace-nowrap`}>
                {event.days_until === 0 ? 'Today' : event.days_until === 1 ? 'Tomorrow' : `${event.days_until} days`}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
