// Supabase Edge Function: notify-admin-new-user
// Sends email notification to admin users when a new user signs up
// Triggered by database webhook on profiles table INSERT

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface WebhookPayload {
  type: 'INSERT'
  table: string
  record: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    role: string
    created_at: string
  }
  schema: string
  old_record: null
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const payload: WebhookPayload = await req.json()

    console.log('📧 New user signup webhook received:', {
      type: payload.type,
      table: payload.table,
      userId: payload.record?.id,
      email: payload.record?.email,
    })

    // Only process INSERT events on profiles table
    if (payload.type !== 'INSERT' || payload.table !== 'profiles') {
      return new Response(
        JSON.stringify({ message: 'Ignored: not a new profile insert' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const newUser = payload.record
    if (!newUser || !newUser.email) {
      return new Response(
        JSON.stringify({ error: 'Missing user data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all admin users
    const { data: admins, error: adminError } = await supabase
      .from('profiles')
      .select('id, email, first_name')
      .eq('role', 'Admin')

    if (adminError) {
      console.error('❌ Error fetching admins:', adminError)
      throw new Error(`Failed to fetch admins: ${adminError.message}`)
    }

    if (!admins || admins.length === 0) {
      console.log('ℹ️ No admin users found to notify')
      return new Response(
        JSON.stringify({ message: 'No admin users to notify' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Format signup date
    const signupDate = new Date(newUser.created_at)
    const formattedDate = signupDate.toLocaleDateString('en-IE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    // Get user's full name or email prefix
    const userName = newUser.first_name && newUser.last_name
      ? `${newUser.first_name} ${newUser.last_name}`
      : newUser.first_name || newUser.email.split('@')[0]

    // Build HTML email
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New User Signup - HiveCraic</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🐝 HiveCraic</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">New User Registration</p>
  </div>

  <div style="background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">

    <h2 style="color: #10b981; margin-top: 0;">A New Beekeeper Has Joined!</h2>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Great news! A new user has signed up for HiveCraic.
    </p>

    <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 25px 0;">
      <p style="margin: 0; font-size: 14px; color: #166534;">
        <strong>Name:</strong> ${userName}<br>
        <strong>Email:</strong> ${newUser.email}<br>
        <strong>Signed Up:</strong> ${formattedDate}
      </p>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      You can view and manage users in the <a href="https://www.hivecraic.com/dashboard/admin" style="color: #10b981; text-decoration: none;">Admin Dashboard</a>.
    </p>

  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 5px 0;">
      This is an automated notification from HiveCraic.
    </p>
    <p style="margin: 5px 0;">
      <a href="https://www.hivecraic.com" style="color: #10b981; text-decoration: none;">HiveCraic</a> -
      Beekeeping Management Made Simple
    </p>
  </div>

</body>
</html>
    `

    // Plain text version
    const textContent = `
HiveCraic - New User Signup

A New Beekeeper Has Joined!

Great news! A new user has signed up for HiveCraic.

Name: ${userName}
Email: ${newUser.email}
Signed Up: ${formattedDate}

You can view and manage users in the Admin Dashboard:
https://www.hivecraic.com/dashboard/admin

---
This is an automated notification from HiveCraic.
    `

    // Send email to all admins
    const adminEmails = admins.map(admin => admin.email).filter(Boolean)

    if (adminEmails.length === 0) {
      console.log('ℹ️ No admin emails found')
      return new Response(
        JSON.stringify({ message: 'No admin emails to send to' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('📧 Sending notification to admins:', adminEmails)

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'HiveCraic <info@hivecraic.com>',
        to: adminEmails,
        subject: `New User Signup: ${userName} has joined HiveCraic`,
        html: htmlContent,
        text: textContent,
      }),
    })

    if (!resendResponse.ok) {
      const error = await resendResponse.text()
      console.error('❌ Resend API error:', error)
      throw new Error(`Failed to send email: ${error}`)
    }

    const result = await resendResponse.json()
    console.log('✅ Admin notification sent successfully:', result)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Admin notification sent successfully',
        emailId: result.id,
        notifiedAdmins: adminEmails.length,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )

  } catch (error) {
    console.error('❌ Error sending admin notification:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to send admin notification',
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
