import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, readJsonBody, MALFORMED_BODY } from '@/lib/server/api-auth'
import { logAdminAction } from '@/lib/admin-audit'

// Fail-fast at module init so a missing env surfaces at deploy time, not in a
// per-request 500 with a generic 'update-user-role error' log line.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'update-user-role: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
  )
}

export async function POST(request: NextRequest) {
  try {
    // Verify the requesting user is an admin
    const auth = await requireAdmin(request)
    if ('response' in auth) return auth.response
    const { user, supabaseAdmin } = auth

    // Parse request body
    const body = await readJsonBody<{ targetUserId?: string; newRole?: string }>(request)
    if (!body) return NextResponse.json({ error: MALFORMED_BODY }, { status: 400 })
    const { targetUserId, newRole } = body

    // Validate inputs
    if (!targetUserId || !newRole) {
      return NextResponse.json(
        { error: 'Missing targetUserId or newRole' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['User', 'Power User', 'Admin']
    if (!validRoles.includes(newRole)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      )
    }

    // Prevent admin from changing their own role
    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 403 }
      )
    }

    // Look up the target's current role so we can detect Admin demotion and
    // run the last-Admin guard below.
    const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', targetUserId)
      .single()

    if (targetProfileError || !targetProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const previousRole = targetProfile.role as string
    const isDemotionFromAdmin = previousRole === 'Admin' && newRole !== 'Admin'

    // Last-Admin guard: if the change would demote the only remaining active Admin,
    // refuse. This check gives the friendly message; the database trigger
    // guard_last_active_admin enforces it atomically (two admins demoting each other
    // at the same moment can't both pass).
    if (isDemotionFromAdmin) {
      const { count: adminCount, error: countError } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'Admin')
        .is('deleted_at', null)
        .not('is_active', 'is', false)

      if (countError) {
        console.error('Error counting admins:', countError)
        return NextResponse.json(
          { error: 'Failed to validate role change' },
          { status: 500 }
        )
      }

      if ((adminCount ?? 0) <= 1) {
        console.warn(`[AUDIT] Admin role change: admin=${user.id} target=${targetUserId} old_role=${previousRole} new_role=${newRole} status=forbidden reason=last_admin timestamp=${new Date().toISOString()}`)
        return NextResponse.json(
          { error: 'Cannot demote the last remaining administrator' },
          { status: 409 }
        )
      }
    }

    // Update the user's role using service role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ role: newRole })
      .eq('id', targetUserId)
      .select('id')

    if (error) {
      console.error('Error updating role:', error)
      if (error.code === '42501') {
        // Raised by guard_last_active_admin.
        return NextResponse.json(
          { error: 'Cannot demote the last remaining administrator' },
          { status: 409 }
        )
      }
      console.warn(`[AUDIT] Admin role change: admin=${user.id} target=${targetUserId} old_role=${previousRole} new_role=${newRole} status=failed timestamp=${new Date().toISOString()}`)
      return NextResponse.json(
        { error: 'Failed to update role' },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    console.warn(`[AUDIT] Admin role change: admin=${user.id} target=${targetUserId} old_role=${previousRole} new_role=${newRole} status=success timestamp=${new Date().toISOString()}`)
    // The profile trigger can't see the admin here (secret-key write), so record it explicitly.
    await logAdminAction(supabaseAdmin, {
      adminId: user.id,
      action: 'role_changed',
      targetUserId,
      details: { role: [previousRole, newRole] },
    })

    // Only a success flag: the profile row holds tokens the browser has no use for.
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in update-user-role:', error)
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    )
  }
}
