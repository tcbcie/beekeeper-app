import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create admin client with service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    // Verify the requesting user is authenticated
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify the token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Fetch active users (not deleted)
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name')
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
