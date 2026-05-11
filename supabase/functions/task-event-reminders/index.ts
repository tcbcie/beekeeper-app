// Task and Event Email Reminders Edge Function
// Sends email reminders for upcoming tasks and events based on user preferences

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') // Optional: Use Resend for emails

interface TaskEvent {
  id: string
  title: string
  description: string | null
  event_type: string
  category: string
  priority: string
  start_date: string
  start_time: string | null
  all_day: boolean
  reminder_enabled: boolean
  reminder_minutes_before: number
  user_id: string
  hive_id: string | null
  apiary_id: string | null
}

interface UserProfile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  enable_task_email_reminders: boolean
  enable_event_email_reminders: boolean
  task_reminder_frequency: string
}

interface ReminderItem {
  title: string
  description: string | null
  type: string
  category: string
  priority: string
  dateTime: string
  location: string | null
  hoursUntil: number
}

// Format date to Irish format (DD/MM/YYYY)
function formatDateIrish(dateString: string): string {
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

// Format time (HH:MM)
function formatTime(timeString: string | null): string {
  if (!timeString) return ''
  const [hours, minutes] = timeString.split(':')
  return `${hours}:${minutes}`
}

// Calculate hours until event
function getHoursUntil(dateStr: string, timeStr: string | null): number {
  const now = new Date()
  const eventDate = new Date(dateStr)

  if (timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number)
    eventDate.setHours(hours, minutes, 0, 0)
  } else {
    eventDate.setHours(9, 0, 0, 0) // Default to 9 AM if no time specified
  }

  return Math.floor((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60))
}

// Get upcoming tasks/events that need reminders
async function getUpcomingReminders(supabase: any, frequency: string): Promise<Map<string, TaskEvent[]>> {
  const now = new Date()
  let startDate: Date
  let endDate: Date

  // Calculate date range based on frequency
  if (frequency === 'realtime') {
    // Next 24 hours
    startDate = now
    endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  } else if (frequency === 'daily') {
    // Today and tomorrow
    startDate = now
    endDate = new Date(now)
    endDate.setDate(endDate.getDate() + 2)
    endDate.setHours(0, 0, 0, 0)
  } else if (frequency === 'weekly') {
    // Next 7 days
    startDate = now
    endDate = new Date(now)
    endDate.setDate(endDate.getDate() + 7)
  } else {
    return new Map()
  }

  // Query tasks and events with reminders enabled
  const { data: tasksEvents, error } = await supabase
    .from('tasks_events')
    .select(`
      id,
      title,
      description,
      event_type,
      category,
      priority,
      start_date,
      start_time,
      all_day,
      reminder_enabled,
      reminder_minutes_before,
      reminder_sent,
      user_id,
      hive_id,
      apiary_id
    `)
    .eq('reminder_enabled', true)
    .eq('reminder_sent', false)
    .eq('completed', false)
    .gte('start_date', startDate.toISOString().split('T')[0])
    .lte('start_date', endDate.toISOString().split('T')[0])

  if (error) {
    throw new Error(`Error fetching tasks/events: ${error.message}`)
  }

  // Filter events that are within reminder window and group by user
  const eventsByUser = new Map<string, TaskEvent[]>()

  for (const event of tasksEvents || []) {
    const hoursUntil = getHoursUntil(event.start_date, event.start_time)
    const reminderHours = Math.floor(event.reminder_minutes_before / 60)
    // All-day events with no explicit start_time should fire any time during
    // the event day, not just in the pre-event window. Without this, a single
    // missed cron tick between 08:00 and 09:00 UTC (the default time for
    // all-day events) drops the reminder permanently.
    const minHoursUntil = event.all_day && !event.start_time ? -24 : 0

    // Check if we should send reminder now
    if (hoursUntil <= reminderHours && hoursUntil >= minHoursUntil) {
      // Always add to task creator
      if (!eventsByUser.has(event.user_id)) {
        eventsByUser.set(event.user_id, [])
      }
      eventsByUser.get(event.user_id)!.push(event)

      // If task is associated with a hive, check if it's shared
      if (event.hive_id) {
        // Get hive to check if it's shared
        const { data: hive } = await supabase
          .from('hives')
          .select('user_id, is_shared')
          .eq('id', event.hive_id)
          .single()

        // If hive is shared, get all team members with access
        if (hive && hive.is_shared) {
          const { data: teamAccess } = await supabase
            .from('team_hive_access')
            .select('team_member_id')
            .eq('hive_id', event.hive_id)

          // Add task to all team members' reminder lists
          if (teamAccess) {
            for (const access of teamAccess) {
              if (!eventsByUser.has(access.team_member_id)) {
                eventsByUser.set(access.team_member_id, [])
              }
              // Only add if not already in the list (to avoid duplicates)
              const userEvents = eventsByUser.get(access.team_member_id)!
              if (!userEvents.find(e => e.id === event.id)) {
                userEvents.push(event)
              }
            }
          }

          // Also add to hive owner if not already included
          if (hive.user_id !== event.user_id) {
            if (!eventsByUser.has(hive.user_id)) {
              eventsByUser.set(hive.user_id, [])
            }
            const ownerEvents = eventsByUser.get(hive.user_id)!
            if (!ownerEvents.find(e => e.id === event.id)) {
              ownerEvents.push(event)
            }
          }
        }
      }
    }
  }

  return eventsByUser
}

// Generate HTML email content
function generateEmailHTML(userName: string, reminders: ReminderItem[], frequency: string): string {
  const reminderRows = reminders.map(reminder => {
    const urgencyColor = reminder.hoursUntil <= 2 ? '#dc2626' :
                         reminder.hoursUntil <= 12 ? '#ea580c' :
                         reminder.hoursUntil <= 24 ? '#ca8a04' : '#2563eb'

    const timeText = reminder.hoursUntil <= 1 ? 'Within 1 hour' :
                     reminder.hoursUntil <= 12 ? `In ${reminder.hoursUntil} hours` :
                     reminder.hoursUntil <= 48 ? `In ${Math.floor(reminder.hoursUntil / 24)} day${Math.floor(reminder.hoursUntil / 24) > 1 ? 's' : ''}` :
                     `In ${Math.floor(reminder.hoursUntil / 24)} days`

    const priorityBadge = reminder.priority === 'urgent' ? '🔴' :
                          reminder.priority === 'high' ? '🟠' :
                          reminder.priority === 'normal' ? '🟡' : '🟢'

    const typeIcon = reminder.type === 'task' ? '✓' :
                     reminder.type === 'event' ? '📅' : '🔔'

    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px;">
          <div style="font-weight: 600; display: flex; align-items: center; gap: 8px;">
            ${typeIcon} ${reminder.title}
          </div>
          ${reminder.description ? `<div style="font-size: 12px; color: #6b7280; margin-top: 4px;">${reminder.description}</div>` : ''}
          ${reminder.location ? `<div style="font-size: 12px; color: #6b7280; margin-top: 4px;">📍 ${reminder.location}</div>` : ''}
        </td>
        <td style="padding: 12px;">
          <span style="background-color: #f3f4f6; color: #374151; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
            ${reminder.category}
          </span>
        </td>
        <td style="padding: 12px; text-align: center;">
          ${priorityBadge}
        </td>
        <td style="padding: 12px;">
          <div style="font-weight: 500;">${reminder.dateTime}</div>
        </td>
        <td style="padding: 12px;">
          <span style="background-color: ${urgencyColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">
            ${timeText}
          </span>
        </td>
      </tr>
    `
  }).join('')

  const digestTitle = frequency === 'daily' ? 'Daily' : frequency === 'weekly' ? 'Weekly' : 'Upcoming'

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${digestTitle} Task & Event Reminders</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 700px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <img src="https://www.hivecraic.com/logo.png" alt="HiveCraic" width="40" height="40" style="width: 40px; height: 40px; margin-bottom: 8px;" />
        <h1 style="margin: 0; color: white; font-size: 24px;">${digestTitle} Task & Event Reminders</h1>
        <p style="margin: 5px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">HiveCraic</p>
      </div>

      <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; margin-top: 0;">Hello ${userName || 'Beekeeper'},</p>

        <p style="font-size: 14px; color: #6b7280;">
          You have <strong>${reminders.length}</strong> upcoming ${reminders.length === 1 ? 'reminder' : 'reminders'} for your beekeeping tasks and events:
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f9fafb; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background-color: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #1f2937;">Title</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #1f2937;">Category</th>
              <th style="padding: 12px; text-align: center; font-weight: 600; color: #1f2937;">Priority</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #1f2937;">Date/Time</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #1f2937;">Due</th>
            </tr>
          </thead>
          <tbody>
            ${reminderRows}
          </tbody>
        </table>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
          <p>You're receiving this email because you enabled ${frequency} email reminders for tasks and events.</p>
          <p>
            To manage your notification preferences, visit
            <a href="${SUPABASE_URL}/dashboard/profile" style="color: #2563eb; text-decoration: none;">your profile settings</a>.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

serve(async (req) => {
  try {
    // Initialize Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get users with email reminders enabled
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, enable_task_email_reminders, enable_event_email_reminders, task_reminder_frequency')
      .or('enable_task_email_reminders.eq.true,enable_event_email_reminders.eq.true')
      .neq('task_reminder_frequency', 'disabled')

    if (profilesError) {
      throw new Error(`Error fetching profiles: ${profilesError.message}`)
    }

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users with email reminders enabled' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const emailsSent: string[] = []
    const errors: string[] = []
    const remindersMarkedSent: string[] = []

    // Process each user
    for (const profile of profiles) {
      const eventsByUser = await getUpcomingReminders(supabase, profile.task_reminder_frequency)
      const userEvents = eventsByUser.get(profile.id)

      if (!userEvents || userEvents.length === 0) continue

      // Filter by user preferences (tasks vs events)
      const filteredEvents = userEvents.filter(event => {
        if (event.event_type === 'task' || event.event_type === 'reminder') {
          return profile.enable_task_email_reminders
        } else if (event.event_type === 'event') {
          return profile.enable_event_email_reminders
        }
        return false
      })

      if (filteredEvents.length === 0) continue

      // Get associated hive/apiary names for location context
      const reminders: ReminderItem[] = []

      for (const event of filteredEvents) {
        let location = null

        if (event.hive_id) {
          const { data: hive } = await supabase
            .from('hives')
            .select('hive_number')
            .eq('id', event.hive_id)
            .single()

          if (hive) location = `Hive ${hive.hive_number}`
        } else if (event.apiary_id) {
          const { data: apiary } = await supabase
            .from('apiaries')
            .select('name')
            .eq('id', event.apiary_id)
            .single()

          if (apiary) location = apiary.name
        }

        const hoursUntil = getHoursUntil(event.start_date, event.start_time)
        const dateTimeStr = event.all_day
          ? formatDateIrish(event.start_date)
          : `${formatDateIrish(event.start_date)} ${formatTime(event.start_time)}`

        reminders.push({
          title: event.title,
          description: event.description,
          type: event.event_type,
          category: event.category,
          priority: event.priority,
          dateTime: dateTimeStr,
          location,
          hoursUntil
        })
      }

      // Sort by urgency
      reminders.sort((a, b) => a.hoursUntil - b.hoursUntil)

      const userName = profile.first_name || 'Beekeeper'
      const emailHTML = generateEmailHTML(userName, reminders, profile.task_reminder_frequency)

      // Send email using Resend (if API key is available)
      if (RESEND_API_KEY) {
        try {
          const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'HiveCraic <info@hivecraic.com>',
              to: [profile.email],
              subject: `🐝 Task & Event Reminders - ${reminders.length} Upcoming`,
              html: emailHTML,
            }),
          })

          if (resendResponse.ok) {
            emailsSent.push(profile.email)

            // Mark reminders as sent
            const eventIds = filteredEvents.map(e => e.id)
            const { error: updateError } = await supabase
              .from('tasks_events')
              .update({ reminder_sent: true })
              .in('id', eventIds)

            if (!updateError) {
              remindersMarkedSent.push(...eventIds)
            }
          } else {
            const errorData = await resendResponse.text()
            errors.push(`Failed to send to ${profile.email}: ${errorData}`)
          }
        } catch (emailError) {
          errors.push(`Exception sending to ${profile.email}: ${emailError}`)
        }
      } else {
        // Log email content if no email service configured
        console.log(`Would send email to ${profile.email}:`, emailHTML)
        emailsSent.push(`${profile.email} (simulated)`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent: emailsSent.length,
        emails: emailsSent,
        remindersMarkedSent: remindersMarkedSent.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in task-event-reminders function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
