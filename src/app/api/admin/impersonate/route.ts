import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Fail-fast at module init so a missing env surfaces at deploy time.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'impersonate: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
  )
}

// Create admin client with service role key to bypass RLS
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    // Verify the requesting user is an admin
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify the token and check user role
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.warn(`[AUDIT] Admin impersonation: auth=failed status=unauthorized timestamp=${new Date().toISOString()}`)
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Check if user is admin AND active. A soft-deleted admin with a still-
    // valid JWT must lose impersonation powers immediately.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'Admin' || profile.is_active === false) {
      console.warn(`[AUDIT] Admin impersonation: admin=${user.id} status=forbidden reason=not_admin_or_inactive timestamp=${new Date().toISOString()}`)
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

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

    // Return the token_hash for client to use with verifyOtp
    return NextResponse.json({
      success: true,
      tokenHash: linkData.properties.hashed_token,
      email: targetUser.user.email,
      displayName
    })

  } catch (error) {
    console.error('Error in impersonate:', error)
    return NextResponse.json(
      { error: 'Failed to impersonate user' },
      { status: 500 }
    )
  }
}
