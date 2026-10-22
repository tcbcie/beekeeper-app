import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/api-auth'
import { logAdminAction } from '@/lib/admin-audit'

// Fail-fast at module init so a missing env surfaces at deploy time.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'user-apiaries: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
  )
}

export async function GET(request: NextRequest) {
  try {
    // Verify the requesting user is an admin
    const auth = await requireAdmin(request)
    if ('response' in auth) return auth.response
    const { user, supabaseAdmin } = auth

    // Get target user ID from query params
    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId')

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      )
    }

    // Fetch apiaries for the target user (bypasses RLS), each with its hive count in the same
    // query (one link from hives to apiaries, so the embedded count is unambiguous).
    const { data: apiaries, error: apiariesError } = await supabaseAdmin
      .from('apiaries')
      .select('id, name, city, hives(count)')
      .eq('user_id', targetUserId)
      .order('name')

    if (apiariesError) {
      console.error('Error fetching apiaries:', apiariesError)
      console.warn(`[AUDIT] Admin user data access: admin=${user.id} target=${targetUserId} resource=apiaries status=failed timestamp=${new Date().toISOString()}`)
      return NextResponse.json(
        { error: 'Failed to fetch apiaries' },
        { status: 500 }
      )
    }

    const apiariesWithCounts = (apiaries || []).map(({ hives, ...apiary }) => ({
      ...apiary,
      hives_count: (hives as { count: number }[] | null)?.[0]?.count ?? 0
    }))

    console.warn(`[AUDIT] Admin user data access: admin=${user.id} target=${targetUserId} resource=apiaries count=${apiariesWithCounts.length} status=success timestamp=${new Date().toISOString()}`)
    await logAdminAction(supabaseAdmin, {
      adminId: user.id,
      action: 'user_apiaries_viewed',
      targetUserId,
      details: { count: apiariesWithCounts.length },
    })

    return NextResponse.json({ apiaries: apiariesWithCounts })

  } catch (error) {
    console.error('Error in user-apiaries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch apiaries' },
      { status: 500 }
    )
  }
}
