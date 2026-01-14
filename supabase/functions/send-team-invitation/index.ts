// Supabase Edge Function: send-team-invitation
// Sends email invitation to users invited to join a team
// Date: 2025-10-30

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface InvitationRequest {
  invitationId: string
  inviteeEmail: string
  teamName: string
  inviterName: string
  inviterEmail: string
  expiresAt: string
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
    // Parse request body
    const {
      invitationId,
      inviteeEmail,
      teamName,
      inviterName,
      inviterEmail,
      expiresAt,
    }: InvitationRequest = await req.json()

    console.log('📧 Sending team invitation email:', {
      invitationId,
      inviteeEmail,
      teamName,
      inviterName,
    })

    // Validate required fields
    if (!invitationId || !inviteeEmail || !teamName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Format expiry date
    const expiryDate = new Date(expiresAt)
    const formattedExpiry = expiryDate.toLocaleDateString('en-IE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })

    // Create Supabase client for generating accept/decline links
    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!
    )

    // Generate accept/decline URLs (these will be handled in the app)
    const appUrl = 'https://www.hivecraic.com'
    const acceptUrl = `${appUrl}/accept-invitation?id=${invitationId}`
    const declineUrl = `${appUrl}/decline-invitation?id=${invitationId}`

    // Build HTML email
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation - HiveCraic</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <img src="https://www.hivecraic.com/logo.png" alt="HiveCraic" width="48" height="48" style="width: 48px; height: 48px; margin-bottom: 10px;" />
    <h1 style="color: white; margin: 0; font-size: 28px;">HiveCraic</h1>
  </div>

  <div style="background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">

    <h2 style="color: #d97706; margin-top: 0;">You've Been Invited to Join a Team!</h2>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Hello! <strong>${inviterName || inviterEmail}</strong> has invited you to join the team
      <strong style="color: #d97706;">${teamName}</strong> on HiveCraic.
    </p>

    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0;">
      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        <strong>Team:</strong> ${teamName}<br>
        <strong>Invited by:</strong> ${inviterName || inviterEmail}<br>
        <strong>Expires:</strong> ${formattedExpiry}
      </p>
    </div>

    <p style="font-size: 16px;">
      By joining this team, you'll be able to collaborate on beekeeping activities, share apiary data,
      and work together with other beekeepers.
    </p>

    <div style="text-align: center; margin: 35px 0;">
      <a href="${acceptUrl}"
         style="display: inline-block; background: #10b981; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 0 10px;">
        ✓ Accept Invitation
      </a>
      <a href="${declineUrl}"
         style="display: inline-block; background: #6b7280; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 0 10px;">
        ✗ Decline
      </a>
    </div>

    <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 6px; margin: 25px 0;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #92400e;">
        <strong>⚠️ New to HiveCraic?</strong>
      </p>
      <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.6;">
        If you don't have a HiveCraic account yet, clicking "Accept Invitation" will take you to the login page
        where you can <strong>sign up for a new account</strong>. After creating your account, you'll be automatically
        redirected back to accept the team invitation.
      </p>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #92400e;">
        <strong>Important:</strong> Please use this email address (<strong>${inviteeEmail}</strong>) when signing up
        to ensure your invitation is processed correctly.
      </p>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      This invitation will expire on <strong>${formattedExpiry}</strong>.
      If you have any questions, please contact ${inviterEmail}.
    </p>

  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 5px 0;">
      You received this email because ${inviterName || inviterEmail} invited you to join their team on HiveCraic.
    </p>
    <p style="margin: 5px 0;">
      <a href="${appUrl}" style="color: #f59e0b; text-decoration: none;">HiveCraic</a> -
      Manage your hives, track inspections, and collaborate with your team.
    </p>
  </div>

</body>
</html>
    `

    // Plain text version for email clients that don't support HTML
    const textContent = `
HiveCraic - Team Invitation

You've Been Invited to Join a Team!

${inviterName || inviterEmail} has invited you to join the team "${teamName}" on HiveCraic.

Team: ${teamName}
Invited by: ${inviterName || inviterEmail}
Expires: ${formattedExpiry}

By joining this team, you'll be able to collaborate on beekeeping activities, share apiary data, and work together with other beekeepers.

To accept this invitation, visit: ${acceptUrl}
To decline this invitation, visit: ${declineUrl}

⚠️ NEW TO HIVECRAIC?
If you don't have a HiveCraic account yet, clicking "Accept Invitation" will take you to the login page where you can sign up for a new account. After creating your account, you'll be automatically redirected back to accept the team invitation.

IMPORTANT: Please use this email address (${inviteeEmail}) when signing up to ensure your invitation is processed correctly.

This invitation will expire on ${formattedExpiry}.

---
You received this email because ${inviterName || inviterEmail} invited you to join their team on HiveCraic.
If you have any questions, please contact ${inviterEmail}.
    `

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'HiveCraic <info@hivecraic.com>', // Verified Resend email
        to: [inviteeEmail],
        subject: `You've been invited to join ${teamName} on HiveCraic`,
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
    console.log('✅ Email sent successfully:', result)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation email sent successfully',
        emailId: result.id,
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
    console.error('❌ Error sending invitation email:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to send invitation email',
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
