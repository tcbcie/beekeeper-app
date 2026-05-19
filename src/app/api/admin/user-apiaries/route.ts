import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Fail-fast at module init so a missing env surfaces at deploy time.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'user-apiaries: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
  )
}

// Create admin client with service role key to bypass RLS
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function GET(request: NextRequest) {
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
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Check if user is admin AND active. Soft-deleted admin must lose access.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'Admin' || profile.is_active === false) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get target user ID from query params
    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId')

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      )
    }

    // Fetch apiaries for the target user (bypasses RLS)
    const { data: apiaries, error: apiariesError } = await supabaseAdmin
      .from('apiaries')
      .select('id, name, city')
      .eq('user_id', targetUserId)
      .order('name')

    if (apiariesError) {
      console.error('Error fetching apiaries:', apiariesError)
      return NextResponse.json(
        { error: 'Failed to fetch apiaries' },
        { status: 500 }
      )
    }

    // Get hive counts for each apiary
    const apiariesWithCounts = await Promise.all(
      (apiaries || []).map(async (apiary) => {
        const { count } = await supabaseAdmin
          .from('hives')
          .select('*', { count: 'exact', head: true })
          .eq('apiary_id', apiary.id)

        return {
          ...apiary,
          hives_count: count || 0
        }
      })
    )

    return NextResponse.json({ apiaries: apiariesWithCounts })

  } catch (error) {
    console.error('Error in user-apiaries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch apiaries' },
      { status: 500 }
    )
  }
}
