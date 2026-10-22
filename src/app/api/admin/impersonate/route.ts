import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/api-auth'
import { logAdminAction } from '@/lib/admin-audit'

// Fail-fast at module init so a missing env surfaces at deploy time.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'impersonate: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
  )
}

const RESEND_API_KEY = process.env.RESEND_API_KEY

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Tell the user an administrator signed in to their account (best-effort; never blocks support). */
async function notifyImpersonatedUser(email: string, firstName: string | null): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('[AUDIT] Impersonation notice not sent: RESEND_API_KEY is not set')
    return
  }
  const when = new Date().toLocaleString('en-IE', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Dublin' })
  const greeting = firstName ? `Hello ${firstName},` : 'Hello,'
  const text = `${greeting}\n\nA HiveCraic administrator signed in to your account on ${when} to help with support.\n\nIf you did not ask for help and have questions, reply to this email.\n\nHiveCraic`
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'HiveCraic <info@hivecraic.com>',
        to: [email],
        subject: 'An administrator accessed your HiveCraic account',
        text,
        html: `<p>${escapeHtml(greeting)}</p><p>A HiveCraic administrator signed in to your account on ${escapeHtml(when)} to help with support.</p><p>If you did not ask for help and have questions, reply to this email.</p><p>HiveCraic</p>`,
      }),
    })
    if (!response.ok) console.error('Impersonation notice failed:', response.status)
  } catch (error) {
    console.error('Impersonation notice failed:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify the requesting user is an admin
    const auth = await requireAdmin(request)
    if ('response' in auth) {
      // Failed impersonation attempts stay in the audit trail.
      const outcome = auth.response.status === 401 ? 'auth=failed status=unauthorized' : 'status=forbidden reason=not_admin_or_inactive'
      console.warn(`[AUDIT] Admin impersonation: ${outcome} timestamp=${new Date().toISOString()}`)
      return auth.response
    }
    const { user, supabaseAdmin } = auth

    // Parse request body
    const body = await request.json()
    const { targetUserId } = body

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Missing targetUserId' },
        { status: 400 }
      )
    }

    // Prevent self-impersonation
    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: 'Cannot impersonate yourself' },
        { status: 400 }
      )
    }

    // Cross-admin protection: an Admin must not be able to silently mint a
    // session for another Admin (lateral movement, no consent trail), and
    // must not be able to revive a disabled account by impersonating it.
    const { data: targetProfileForGate, error: targetProfileGateError } = await supabaseAdmin
      .from('profiles')
      .select('role, is_active')
      .eq('id', targetUserId)
      .single()

    if (targetProfileGateError || !targetProfileForGate) {
      console.warn(`[AUDIT] Admin impersonation: admin=${user.id} target=${targetUserId} status=forbidden reason=target_profile_missing timestamp=${new Date().toISOString()}`)
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
    }

    if (targetProfileForGate.role === 'Admin') {
      console.warn(`[AUDIT] Admin impersonation: admin=${user.id} target=${targetUserId} status=forbidden reason=target_is_admin timestamp=${new Date().toISOString()}`)
      return NextResponse.json(
        { error: 'Cannot impersonate another admin' },
        { status: 403 }
      )
    }

    if (targetProfileForGate.is_active === false) {
      console.warn(`[AUDIT] Admin impersonation: admin=${user.id} target=${targetUserId} status=forbidden reason=target_inactive timestamp=${new Date().toISOString()}`)
      return NextResponse.json(
        { error: 'Cannot impersonate a disabled account' },
        { status: 403 }
      )
    }

    // Get target user email from Supabase Auth
    const { data: targetUser, error: targetError } = await supabaseAdmin.auth.admin.getUserById(targetUserId)

    if (targetError || !targetUser?.user?.email) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
    }

    // Also gate on the auth-side banned_until flag -- a target can be
    // is_active=true in profiles but banned at the auth layer.
    const bannedUntilRaw = (targetUser.user as { banned_until?: string | null }).banned_until
    if (bannedUntilRaw) {
      const bannedUntil = new Date(bannedUntilRaw)
      if (!Number.isNaN(bannedUntil.getTime()) && bannedUntil > new Date()) {
        console.warn(`[AUDIT] Admin impersonation: admin=${user.id} target=${targetUserId} status=forbidden reason=target_banned timestamp=${new Date().toISOString()}`)
        return NextResponse.json(
          { error: 'Cannot impersonate a banned account' },
          { status: 403 }
        )
      }
    }

    // Generate magic link for target user
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.user.email
    })

    if (linkError || !linkData) {
      console.error('Error generating impersonation link:', linkError)
      return NextResponse.json(
        { error: 'Failed to generate impersonation link' },
        { status: 500 }
      )
    }

    // Record the impersonation before handing out the session; no record, no session.
    const logged = await logAdminAction(supabaseAdmin, {
      adminId: user.id,
      action: 'impersonation_started',
      targetUserId,
    })
    if (!logged) {
      return NextResponse.json(
        { error: 'Could not record the impersonation; please try again' },
        { status: 500 }
      )
    }

    // Get target user's profile for display name
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', targetUserId)
      .single()

    const displayName = targetProfile?.first_name && targetProfile?.last_name
      ? `${targetProfile.first_name} ${targetProfile.last_name}`
      : targetUser.user.email

    console.warn(`[AUDIT] Admin impersonation: admin=${user.id} target=${targetUserId} status=success timestamp=${new Date().toISOString()}`)

    await notifyImpersonatedUser(targetUser.user.email, targetProfile?.first_name ?? null)

    // Return the token_hash for client to use with verifyOtp. The response
    // body contains a single-use credential -- mark it uncacheable so it
    // cannot be retained by any intermediate proxy or browser cache. Real
    // exposure mitigation requires short magic-link TTL + post-impersonation
    // session attribution, which is operational, not code-level.
    return NextResponse.json(
      {
        success: true,
        tokenHash: linkData.properties.hashed_token,
        email: targetUser.user.email,
        displayName
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
          'Pragma': 'no-cache',
          'Referrer-Policy': 'no-referrer'
        }
      }
    )

  } catch (error) {
    console.error('Error in impersonate:', error)
    return NextResponse.json(
      { error: 'Failed to impersonate user' },
      { status: 500 }
    )
  }
}

/**
 * Called by the impersonation banner after it restores the admin's own session, so the end of
 * an impersonation is recorded too.
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('response' in auth) return auth.response
    const { user, supabaseAdmin } = auth

    let targetEmail: string | null = null
    try {
      const body = await request.json()
      if (typeof body?.targetEmail === 'string') targetEmail = body.targetEmail.trim().slice(0, 254) || null
    } catch {
      // No body: still record the exit.
    }

    await logAdminAction(supabaseAdmin, {
      adminId: user.id,
      action: 'impersonation_ended',
      details: targetEmail ? { target_email: targetEmail } : {},
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error recording impersonation exit:', error)
    return NextResponse.json({ error: 'Failed to record impersonation exit' }, { status: 500 })
  }
}
