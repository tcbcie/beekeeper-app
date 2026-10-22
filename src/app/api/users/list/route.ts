import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/api-auth'

// Fail-fast at module init so a missing env surfaces at deploy time.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'users/list: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
  )
}

export async function GET(request: NextRequest) {
  try {
    // Admins only
    const auth = await requireAdmin(request)
    if ('response' in auth) return auth.response
    const { supabaseAdmin } = auth

    // Fetch active users (not deleted). If a user has neither first_name nor
    // last_name, the client renders a generic placeholder.
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name')
      .is('deleted_at', null)
      .order('first_name', { ascending: true })

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    return NextResponse.json({ users: users || [] })

  } catch (error) {
    console.error('Error in users/list:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
