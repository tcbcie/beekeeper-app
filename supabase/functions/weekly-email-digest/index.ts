// Weekly Email Digest Edge Function
// Sends weekly summary of upcoming queen rearing dates to users who have enabled email digest

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') // Optional: Use Resend for emails

interface Batch {
  id: string
  batch_name: string
  acceptance_check_date: string | null
  first_option_to_cage_date: string | null
  second_option_to_cage_date: string | null
  emergence_date: string | null
  user_id: string
}

interface UserProfile {
  user_id: string
  email: string
  first_name: string | null
  last_name: string | null
}

interface UpcomingEvent {
  batchName: string
  eventType: string
  date: string
  daysUntil: number
}

// Format date to Irish format (DD/MM/YYYY)
function formatDateIrish(dateString: string): string {
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

// Get upcoming events for a batch within the next 7 days
function getUpcomingEvents(batch: Batch): UpcomingEvent[] {
  const events: UpcomingEvent[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sevenDaysFromNow = new Date(today)
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

  const checkDate = (dateStr: string | null, eventType: string) => {
    if (!dateStr) return

    const eventDate = new Date(dateStr)
    eventDate.setHours(0, 0, 0, 0)

    if (eventDate >= today && eventDate <= sevenDaysFromNow) {
      const daysUntil = Math.floor((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      events.push({
        batchName: batch.batch_name,
        eventType,
        date: dateStr,
        daysUntil,
      })
    }
  }

  checkDate(batch.acceptance_check_date, 'Acceptance Check')
  checkDate(batch.first_option_to_cage_date, '1st Option to Cage')
  checkDate(batch.second_option_to_cage_date, '2nd Option to Cage')
  checkDate(batch.emergence_date, 'Expected Hatch Date')

  return events.sort((a, b) => a.daysUntil - b.daysUntil)
}

// Generate HTML email content
function generateEmailHTML(userName: string, events: UpcomingEvent[]): string {
  const eventRows = events.map(event => {
    const urgencyColor = event.daysUntil === 0 ? '#dc2626' :
                         event.daysUntil === 1 ? '#ea580c' :
                         event.daysUntil <= 3 ? '#ca8a04' : '#2563eb'

    const daysText = event.daysUntil === 0 ? 'Today' :
                     event.daysUntil === 1 ? 'Tomorrow' :
                     `In ${event.daysUntil} days`

    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px; font-weight: 600;">${event.batchName}</td>
        <td style="padding: 12px;">${event.eventType}</td>
        <td style="padding: 12px;">${formatDateIrish(event.date)}</td>
        <td style="padding: 12px;">
          <span style="background-color: ${urgencyColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">
            ${daysText}
          </span>
        </td>
      </tr>
    `
  }).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Weekly Queen Rearing Digest</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <img src="https://www.hivecraic.com/logo.png" alt="HiveCraic" width="40" height="40" style="width: 40px; height: 40px; margin-bottom: 8px;" />
        <h1 style="margin: 0; color: white; font-size: 24px;">Weekly Queen Rearing Digest</h1>
        <p style="margin: 5px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">HiveCraic</p>
      </div>

      <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; margin-top: 0;">Hello ${userName || 'Beekeeper'},</p>

        <p style="font-size: 14px; color: #6b7280;">
          Here's your weekly summary of upcoming queen rearing dates for the next 7 days:
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f9fafb; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background-color: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #1f2937;">Batch</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #1f2937;">Event</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #1f2937;">Date</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #1f2937;">Timing</th>
            </tr>
          </thead>
          <tbody>
            ${eventRows}
          </tbody>
        </table>

        <p style="font-size: 14px; color: #6b7280;">
          <strong>Reminder:</strong> 3-5-8 - The Queen is made!
        </p>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
          <p>You're receiving this email because you enabled weekly email digest for your queen rearing batches.</p>
          <p>
            To manage your notification preferences, visit
            <a href="${SUPABASE_URL}/dashboard/batches" style="color: #2563eb; text-decoration: none;">your batches page</a>.
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

    // Get all batches with email digest enabled
    const { data: batches, error: batchesError } = await supabase
      .from('rearing_batches')
      .select('id, batch_name, acceptance_check_date, first_option_to_cage_date, second_option_to_cage_date, emergence_date, user_id')
      .eq('enable_email_digest', true)

    if (batchesError) {
      throw new Error(`Error fetching batches: ${batchesError.message}`)
    }

    if (!batches || batches.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No batches with email digest enabled' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Group batches by user_id
    const batchesByUser = batches.reduce((acc, batch) => {
      if (!acc[batch.user_id]) {
        acc[batch.user_id] = []
      }
      acc[batch.user_id].push(batch)
      return acc
    }, {} as Record<string, Batch[]>)

    // Get user emails
    const userIds = Object.keys(batchesByUser)
    const { data: userProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('user_id, email, first_name, last_name')
      .in('user_id', userIds)

    if (profilesError) {
      throw new Error(`Error fetching user profiles: ${profilesError.message}`)
    }

    const emailsSent: string[] = []
    const errors: string[] = []

    // Process each user
    for (const profile of userProfiles || []) {
      const userBatches = batchesByUser[profile.user_id]
      if (!userBatches) continue

      // Get all upcoming events for this user's batches
      const allEvents: UpcomingEvent[] = []
      userBatches.forEach(batch => {
        const events = getUpcomingEvents(batch)
        allEvents.push(...events)
      })

      // Skip if no upcoming events
      if (allEvents.length === 0) continue

      // Sort events by date
      allEvents.sort((a, b) => a.daysUntil - b.daysUntil)

      const userName = profile.first_name || 'Beekeeper'
      const emailHTML = generateEmailHTML(userName, allEvents)

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
              from: 'HiveCraic <info@hivecraic.com>', // Verified Resend email
              to: [profile.email],
              subject: `🐝 Weekly Queen Rearing Digest - ${allEvents.length} Upcoming Event${allEvents.length > 1 ? 's' : ''}`,
              html: emailHTML,
            }),
          })

          if (resendResponse.ok) {
            emailsSent.push(profile.email)
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
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in weekly-email-digest function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
