'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { CalendarDays, Plus, Pencil, Trash2, Loader2, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

// Colours for different years — must match the parent chart's palette
const YEAR_COLORS = [
  { bg: 'rgba(34, 197, 94, 0.8)', border: 'rgb(22, 163, 74)' },
  { bg: 'rgba(249, 115, 22, 0.8)', border: 'rgb(234, 88, 12)' },
  { bg: 'rgba(59, 130, 246, 0.8)', border: 'rgb(37, 99, 235)' },
  { bg: 'rgba(168, 85, 247, 0.8)', border: 'rgb(147, 51, 234)' },
  { bg: 'rgba(236, 72, 153, 0.8)', border: 'rgb(219, 39, 119)' },
]

export interface KeyEvent {
  id: string
  apiary_id: string
  event_type_id: string
  event_date: string
  year: number
  notes: string | null
  dropdown_values: { value: string } | { value: string }[]
}

interface EventTypeOption {
  id: string
  value: string
}

interface KeyEventsOverlayProps {
  userId: string
  apiaryId: string | undefined
  selectedYears: number[]
  /** Sorted year list used in the parent chart — needed to match colour indices */
  chartYearOrder: number[]
}

/**
 * Builds Chart.js annotation objects for key events.
 * The accumulation x-axis uses category indices where each index = dayNumber (1, 8, 15, ... step 7).
 */
export function buildEventAnnotations(
  events: KeyEvent[],
  selectedYears: number[],
  chartYearOrder: number[]
) {
  const annotations: Record<string, object> = {}

  events.forEach((evt, i) => {
    if (!selectedYears.includes(evt.year)) return

    const eventDate = new Date(evt.event_date)
    const dayOfYear = Math.floor(
      (eventDate.getTime() - new Date(evt.year, 0, 0).getTime()) / 86400000
    )
    // Map to nearest x-axis tick index (ticks are day 1, 8, 15, ... step 7)
    const tickIndex = Math.round((dayOfYear - 1) / 7)

    const yearIdx = chartYearOrder.indexOf(evt.year)
    const colorIdx = yearIdx >= 0 ? yearIdx % YEAR_COLORS.length : 0

    const typeName = Array.isArray(evt.dropdown_values)
      ? evt.dropdown_values[0]?.value ?? 'Event'
      : evt.dropdown_values?.value ?? 'Event'

    annotations[`event_${i}`] = {
      type: 'line' as const,
      xMin: tickIndex,
      xMax: tickIndex,
      borderColor: YEAR_COLORS[colorIdx].border,
      borderWidth: 1.5,
      borderDash: [4, 4],
      label: {
        display: true,
        content: typeName,
        position: 'start' as const,
        backgroundColor: YEAR_COLORS[colorIdx].bg,
        color: '#fff',
        font: { size: 9 },
        rotation: 270,
        padding: { top: 2, bottom: 2, left: 3, right: 3 },
      },
    }
  })

  return annotations
}

export function useKeyEvents({
  userId,
  apiaryId,
  selectedYears,
  chartYearOrder,
}: KeyEventsOverlayProps) {
  const toast = useToast()
  const [events, setEvents] = useState<KeyEvent[]>([])
  const [eventTypes, setEventTypes] = useState<EventTypeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [eventDate, setEventDate] = useState('')
  const [eventTypeId, setEventTypeId] = useState('')
  const [notes, setNotes] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Fetch event types from dropdown_values
  useEffect(() => {
    const fetchTypes = async () => {
      const { data } = await supabase
        .from('dropdown_categories')
        .select('id')
        .eq('category_key', 'key_event_type')
        .single()

      if (data) {
        const { data: values } = await supabase
          .from('dropdown_values')
          .select('id, value')
          .eq('category_id', data.id)
          .eq('is_active', true)
          .order('display_order')

        if (values) setEventTypes(values)
      }
    }
    fetchTypes()
  }, [])

  // Fetch events for selected apiary
  const fetchEvents = useCallback(async () => {
    if (!apiaryId) { setLoading(false); return }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('key_events')
        .select('id, apiary_id, event_type_id, event_date, year, notes, dropdown_values(value)')
        .eq('user_id', userId)
        .eq('apiary_id', apiaryId)
        .order('event_date', { ascending: false })

      if (error) {
        console.error('Failed to fetch key events:', error.message)
        return
      }

      setEvents((data as KeyEvent[]) || [])
    } catch (err) {
      console.error('Failed to fetch key events:', err)
    } finally {
      setLoading(false)
    }
  }, [userId, apiaryId])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Filtered events for display (only selected years)
  const filteredEvents = useMemo(() =>
    events.filter(e => selectedYears.includes(e.year)),
    [events, selectedYears]
  )

  // Annotations ready for chart consumption
  const annotations = useMemo(() =>
    buildEventAnnotations(filteredEvents, selectedYears, chartYearOrder),
    [filteredEvents, selectedYears, chartYearOrder]
  )

  const resetForm = () => {
    setEventDate('')
    setEventTypeId('')
    setNotes('')
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = (evt: KeyEvent) => {
    setEditingId(evt.id)
    setEventDate(evt.event_date)
    setEventTypeId(evt.event_type_id)
    setNotes(evt.notes || '')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!eventDate || !eventTypeId || !apiaryId) return

    setSaving(true)
    try {
      const year = new Date(eventDate).getFullYear()

      if (editingId) {
        const { error } = await supabase
          .from('key_events')
          .update({
            event_type_id: eventTypeId,
            event_date: eventDate,
            year,
            notes: notes.trim() || null,
          })
          .eq('id', editingId)

        if (error) {
          toast.error('Failed to update event')
          console.error(error.message)
          return
        }

        toast.success('Event updated')
      } else {
        const { error } = await supabase
          .from('key_events')
          .insert({
            user_id: userId,
            apiary_id: apiaryId,
            event_type_id: eventTypeId,
            event_date: eventDate,
            year,
            notes: notes.trim() || null,
          })

        if (error) {
          toast.error('Failed to save event')
          console.error(error.message)
          return
        }

        toast.success('Event recorded')
      }

      resetForm()
      fetchEvents()
    } catch (err) {
      console.error('Failed to save key event:', err)
      toast.error('Failed to save event')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('key_events')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete event')
      return
    }

    toast.success('Event deleted')
    fetchEvents()
  }

  const getEventTypeName = (evt: KeyEvent) => {
    if (Array.isArray(evt.dropdown_values)) return evt.dropdown_values[0]?.value ?? '—'
    return evt.dropdown_values?.value ?? '—'
  }

  return {
    annotations,
    events: filteredEvents,
    loading,
    panel: (
      <div className="space-y-3">
        {/* Quick-add toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <CalendarDays size={14} className="text-text-secondary" />
            Key Events ({filteredEvents.length})
          </span>
          <Button
            onClick={() => {
              if (showForm) { resetForm() } else { setShowForm(true) }
            }}
            className="px-2 py-1 text-xs rounded-lg bg-forest-600 text-white hover:bg-forest-700 transition-colors flex items-center gap-1"
          >
            {showForm ? <X size={12} /> : <Plus size={12} />}
            {showForm ? 'Cancel' : 'Add'}
          </Button>
        </div>

        {/* Inline add form */}
        {showForm && (
          <div className="flex flex-wrap items-end gap-2 p-3 bg-surface-secondary dark:bg-surface-elevated rounded-lg border border-border">
            <div className="space-y-1">
              <label className="text-xs text-text-secondary">Date</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="px-2 py-1.5 text-sm border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-secondary">Event Type</label>
              <select
                value={eventTypeId}
                onChange={(e) => setEventTypeId(e.target.value)}
                className="px-2 py-1.5 text-sm border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground"
              >
                <option value="">Select...</option>
                {eventTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.value}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-secondary">Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Brief note..."
                className="px-2 py-1.5 text-sm border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground"
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={!eventDate || !eventTypeId || saving}
              className="px-3 py-1.5 text-sm rounded-lg bg-forest-600 text-white hover:bg-forest-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : editingId ? 'Update' : 'Save'}
            </Button>
          </div>
        )}

        {/* Event list */}
        {loading ? (
          <div className="flex justify-center py-2">
            <Loader2 size={16} className="animate-spin text-text-tertiary" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <p className="text-xs text-text-tertiary">No events recorded for selected years.</p>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {filteredEvents.map(evt => (
              <div key={evt.id} className="flex items-center justify-between gap-2 px-2 py-1.5 bg-surface-secondary dark:bg-surface-elevated rounded text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-text-tertiary tabular-nums shrink-0">
                    {new Date(evt.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="font-medium text-foreground truncate">{getEventTypeName(evt)}</span>
                  {evt.notes && <span className="text-xs text-text-tertiary truncate">— {evt.notes}</span>}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => handleEdit(evt)}
                    className="p-1 text-text-tertiary hover:text-forest-600 transition-colors"
                    title="Edit event"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(evt.id)}
                    className="p-1 text-text-tertiary hover:text-red-600 transition-colors"
                    title="Delete event"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
  }
}
