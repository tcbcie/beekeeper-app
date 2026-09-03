import { supabase } from '@/lib/supabase'

/**
 * Keeps a treatment's "take the strips out" reminder in step with the treatment.
 *
 * The reminder is an ordinary `tasks_events` row, which is what makes this cheap:
 * the pg_cron job already running every fifteen minutes emails it, and the
 * Upcoming Events widget, the tasks page and the apiary Visit Checklist all
 * display it without further work. Web Push is not used — the subscription table
 * has never had a row written to it and nothing in the app subscribes, so a push
 * reminder would reach nobody.
 *
 * The row is found by `tasks_events.treatment_id`, a real foreign key. The
 * existing batch-to-task trigger matches on `title LIKE 'Acceptance Check: %'`
 * instead, which breaks the moment a title is edited; that is not repeated here.
 *
 * Reminders are enabled by default, unlike the inspection follow-up tasks which
 * ask the user to opt in per task. A reminder nobody asked to switch on is the
 * entire point of the feature. The per-user preference still governs delivery, so
 * anyone who has turned reminders off is unaffected.
 */
export interface TreatmentReminderInput {
  treatmentId: string
  userId: string
  hiveId: string
  hiveNumber?: string | null
  apiaryId: string | null
  isTeamTask: boolean
  treatmentType: string
  treatmentDate: string
  plannedRemovalDate: string | null
  removedDate: string | null
}

export interface TreatmentReminderResult {
  /** False when the reminder could not be written. The treatment is still saved. */
  ok: boolean
  /** What happened, for the caller's message and for logging. */
  action: 'created' | 'updated' | 'deleted' | 'none'
  error?: string
}

export function buildReminderTitle(treatmentType: string, hiveNumber?: string | null): string {
  const product = treatmentType?.trim() || 'treatment'
  return hiveNumber ? `Remove ${product} — Hive ${hiveNumber}` : `Remove ${product}`
}

export async function syncTreatmentReminder(
  input: TreatmentReminderInput
): Promise<TreatmentReminderResult> {
  const {
    treatmentId,
    userId,
    hiveId,
    hiveNumber,
    apiaryId,
    isTeamTask,
    treatmentType,
    treatmentDate,
    plannedRemovalDate,
    removedDate,
  } = input

  try {
    const { data: existingRows, error: lookupError } = await supabase
      .from('tasks_events')
      .select('id, start_date, completed')
      .eq('treatment_id', treatmentId)
      .eq('user_id', userId)
      .limit(1)

    if (lookupError) throw lookupError
    const existing = existingRows?.[0] ?? null

    // No removal planned means there is nothing to be reminded about. Clearing
    // the date on an edit must take the old reminder with it.
    if (!plannedRemovalDate) {
      if (!existing) return { ok: true, action: 'none' }
      const { error } = await supabase.from('tasks_events').delete().eq('id', existing.id)
      if (error) throw error
      return { ok: true, action: 'deleted' }
    }

    const isRemoved = Boolean(removedDate)
    const fields = {
      title: buildReminderTitle(treatmentType, hiveNumber),
      start_date: plannedRemovalDate,
      hive_id: hiveId,
      apiary_id: apiaryId,
      is_team_task: isTeamTask,
      completed: isRemoved,
      completed_at: isRemoved ? new Date().toISOString() : null,
      notes: `Auto-created from a varroa treatment recorded on ${treatmentDate}.`,
    }

    if (existing) {
      const { error } = await supabase
        .from('tasks_events')
        .update({
          ...fields,
          // A reminder already sent for the old date must be allowed to send
          // again for a new one, or moving the date silently loses it. The same
          // applies when a treatment marked removed is re-opened: the beekeeper
          // put it back, so the reminder has to be able to fire again.
          ...(existing.start_date !== plannedRemovalDate || (existing.completed && !isRemoved)
            ? { reminder_sent: false }
            : {}),
        })
        .eq('id', existing.id)

      if (error) throw error
      return { ok: true, action: 'updated' }
    }

    // Already removed on the very first save — there is nothing left to remind
    // about, so no row is created rather than one created and closed at once.
    if (isRemoved) return { ok: true, action: 'none' }

    const { error } = await supabase.from('tasks_events').insert([{
      ...fields,
      user_id: userId,
      treatment_id: treatmentId,
      description: 'The treatment period is up. Check the hive and remove the treatment.',
      event_type: 'task',
      category: 'treatment',
      priority: 'normal',
      all_day: true,
      reminder_enabled: true,
      reminder_sent: false,
    }])

    if (error) throw error
    return { ok: true, action: 'created' }
  } catch (error) {
    return {
      ok: false,
      action: 'none',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
