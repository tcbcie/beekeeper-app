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
    const appUrl = SUPABASE_URL!.replace('.supabase.co', '')
    const acceptUrl = `${appUrl}/accept-invitation?id=${invitationId}`
    const declineUrl = `${appUrl}/decline-invitation?id=${invitationId}`

    // Build HTML email
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation - Beekeeper App</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="background: linear-gradient(135deg, #9333ea 0%, #7e22ce 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🐝 Beekeeper App</h1>
  </div>

  <div style="background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">

    <h2 style="color: #9333ea; margin-top: 0;">You've Been Invited to Join a Team!</h2>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Hello! <strong>${inviterName || inviterEmail}</strong> has invited you to join the team
      <strong style="color: #9333ea;">${teamName}</strong> on Beekeeper App.
    </p>

    <div style="background: #f9fafb; border-left: 4px solid #9333ea; padding: 15px; margin: 25px 0;">
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
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>⚠️ Note:</strong> If you don't have a Beekeeper App account yet, you'll need to
        <a href="${appUrl}/signup" style="color: #9333ea; text-decoration: none; font-weight: 600;">create one</a>
        first. Use this email address (${inviteeEmail}) when signing up, and your invitation will be
        automatically accepted.
      </p>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      This invitation will expire on <strong>${formattedExpiry}</strong>.
      If you have any questions, please contact ${inviterEmail}.
    </p>

  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 5px 0;">
      You received this email because ${inviterName || inviterEmail} invited you to join their team on Beekeeper App.
    </p>
    <p style="margin: 5px 0;">
      <a href="${appUrl}" style="color: #9333ea; text-decoration: none;">Beekeeper App</a> -
      Manage your hives, track inspections, and collaborate with your team.
    </p>
    <p style="margin: 15px 0 5px 0; font-size: 11px;">
      🤖 Generated with <a href="https://claude.com/claude-code" style="color: #9333ea; text-decoration: none;">Claude Code</a>
    </p>
  </div>

</body>
</html>
    `

    // Plain text version for email clients that don't support HTML
    const textContent = `
Beekeeper App - Team Invitation

You've Been Invited to Join a Team!

${inviterName || inviterEmail} has invited you to join the team "${teamName}" on Beekeeper App.

Team: ${teamName}
Invited by: ${inviterName || inviterEmail}
Expires: ${formattedExpiry}

By joining this team, you'll be able to collaborate on beekeeping activities, share apiary data, and work together with other beekeepers.

To accept this invitation, visit: ${acceptUrl}
To decline this invitation, visit: ${declineUrl}

Note: If you don't have a Beekeeper App account yet, you'll need to create one first at ${appUrl}/signup.
Use this email address (${inviteeEmail}) when signing up, and your invitation will be automatically accepted.

This invitation will expire on ${formattedExpiry}.

---
You received this email because ${inviterName || inviterEmail} invited you to join their team on Beekeeper App.
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
        from: 'Beekeeper App <noreply@yourdomain.com>', // TODO: Update with your domain
        to: [inviteeEmail],
        subject: `You've been invited to join ${teamName} on Beekeeper App`,
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
