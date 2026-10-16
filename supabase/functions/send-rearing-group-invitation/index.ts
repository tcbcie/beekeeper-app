// Supabase Edge Function: send-rearing-group-invitation
// Sends email invitation to users invited to join a rearing group

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
// New sb_secret_ key (SUPABASE_SECRET_KEYS is a JSON object keyed by key name), with the
// legacy service_role key as a fallback until the legacy keys are deactivated.
function readSecretKey(): string | undefined {
  try {
    const key = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default
    if (typeof key === 'string' && key) return key
  } catch { /* fall back to the legacy key */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
}
const SUPABASE_SERVICE_ROLE_KEY = readSecretKey()
// Key type only (never the value), to confirm the migration before legacy keys are switched off
console.log('Supabase server key type:', SUPABASE_SERVICE_ROLE_KEY?.startsWith('sb_secret_') ? 'secret' : 'legacy')

interface InvitationRequest {
  invitationId: string
}

function escapeHtml(value: unknown): string {
  if (value == null) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
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
    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!
    )

    // The caller must be the signed-in user who created this invitation. Every detail in the
    // email comes from the database, never from the request body, so this function cannot be
    // used to send arbitrary mail from our domain.
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return jsonResponse({ error: 'Unauthorised' }, 401)

    const { invitationId }: InvitationRequest = await req.json()
    if (!invitationId) return jsonResponse({ error: 'Missing invitationId' }, 400)

    const { data: invitation } = await supabase
      .from('rearing_group_invitations')
      .select('id, email, invited_by, status, expires_at, rearing_groups(name)')
      .eq('id', invitationId)
      .maybeSingle()

    if (!invitation || invitation.invited_by !== user.id || invitation.status !== 'pending') {
      return jsonResponse({ error: 'Invitation not found' }, 403)
    }

    const { data: inviter } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .maybeSingle()

    const groups = invitation.rearing_groups as { name: string } | { name: string }[] | null
    const groupName = (Array.isArray(groups) ? groups[0]?.name : groups?.name) || 'a rearing group'
    const inviteeEmail = invitation.email as string
    const inviterEmail = inviter?.email || user.email || ''
    const inviterName = [inviter?.first_name, inviter?.last_name].filter(Boolean).join(' ')

    console.log('📧 Sending rearing group invitation email:', { invitationId: invitation.id })

    const expiryDate = new Date(invitation.expires_at as string)
    const formattedExpiry = expiryDate.toLocaleDateString('en-IE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })

    const appUrl = 'https://www.hivecraic.com'
    const acceptUrl = `${appUrl}/accept-rearing-group-invitation?id=${invitation.id}`
    const declineUrl = `${appUrl}/decline-rearing-group-invitation?id=${invitation.id}`

    // HTML-safe copies of user-controlled text
    const h = {
      group: escapeHtml(groupName),
      inviter: escapeHtml(inviterName || inviterEmail),
      inviterEmail: escapeHtml(inviterEmail),
      invitee: escapeHtml(inviteeEmail),
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rearing Group Invitation - HiveCraic</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <img src="https://www.hivecraic.com/logo.png" alt="HiveCraic" width="48" height="48" style="width: 48px; height: 48px; margin-bottom: 10px;" />
    <h1 style="color: white; margin: 0; font-size: 28px;">HiveCraic</h1>
  </div>

  <div style="background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">

    <h2 style="color: #d97706; margin-top: 0;">You've Been Invited to Join a Queen Rearing Group!</h2>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Hello! <strong>${h.inviter}</strong> has invited you to join the queen rearing group
      <strong style="color: #d97706;">${h.group}</strong> on HiveCraic.
    </p>

    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0;">
      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        <strong>Group:</strong> ${h.group}<br>
        <strong>Invited by:</strong> ${h.inviter}<br>
        <strong>Expires:</strong> ${formattedExpiry}
      </p>
    </div>

    <p style="font-size: 16px;">
      By joining this rearing group, the group owner will be able to include your queen rearing batch data
      in consolidated monthly reports.
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
        redirected back to accept the invitation.
      </p>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #92400e;">
        <strong>Important:</strong> Please use this email address (<strong>${h.invitee}</strong>) when signing up
        to ensure your invitation is processed correctly.
      </p>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      This invitation will expire on <strong>${formattedExpiry}</strong>.
      If you have any questions, please contact ${h.inviterEmail}.
    </p>

  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 5px 0;">
      You received this email because ${h.inviter} invited you to join their queen rearing group on HiveCraic.
    </p>
    <p style="margin: 5px 0;">
      <a href="${appUrl}" style="color: #f59e0b; text-decoration: none;">HiveCraic</a> -
      Manage your hives, track inspections, and collaborate with your team.
    </p>
  </div>

</body>
</html>
    `

    const textContent = `
HiveCraic - Queen Rearing Group Invitation

You've Been Invited to Join a Queen Rearing Group!

${inviterName || inviterEmail} has invited you to join the queen rearing group "${groupName}" on HiveCraic.

Group: ${groupName}
Invited by: ${inviterName || inviterEmail}
Expires: ${formattedExpiry}

By joining this rearing group, the group owner will be able to include your queen rearing batch data in consolidated monthly reports.

To accept this invitation, visit: ${acceptUrl}
To decline this invitation, visit: ${declineUrl}

⚠️ NEW TO HIVECRAIC?
If you don't have a HiveCraic account yet, clicking "Accept Invitation" will take you to the login page where you can sign up for a new account. After creating your account, you'll be automatically redirected back to accept the invitation.

IMPORTANT: Please use this email address (${inviteeEmail}) when signing up to ensure your invitation is processed correctly.

This invitation will expire on ${formattedExpiry}.

---
You received this email because ${inviterName || inviterEmail} invited you to join their queen rearing group on HiveCraic.
If you have any questions, please contact ${inviterEmail}.
    `

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'HiveCraic <info@hivecraic.com>',
        to: [inviteeEmail],
        subject: `You've been invited to join ${groupName} on HiveCraic`,
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
