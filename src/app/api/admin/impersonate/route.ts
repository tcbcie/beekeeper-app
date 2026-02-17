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

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'Admin') {
      console.warn(`[AUDIT] Admin impersonation: admin=${user.id} status=forbidden reason=not_admin timestamp=${new Date().toISOString()}`)
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

    // Get target user email from Supabase Auth
    const { data: targetUser, error: targetError } = await supabaseAdmin.auth.admin.getUserById(targetUserId)

    if (targetError || !targetUser?.user?.email) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
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
