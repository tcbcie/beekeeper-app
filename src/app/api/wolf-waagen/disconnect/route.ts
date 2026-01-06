import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    // Get auth token from request
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Clear Wolf Waagen token from profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        wolf_api_token: null,
        wolf_connected_at: null,
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('Failed to clear Wolf Waagen token:', profileError)
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
    }

    // Clear Wolf scale assignments from all user's hives
    const { error: hivesError } = await supabaseAdmin
      .from('hives')
      .update({
        wolf_scale_id: null,
        wolf_scale_name: null,
      })
      .eq('user_id', user.id)

    if (hivesError) {
      console.error('Failed to clear Wolf scale assignments:', hivesError)
      // Continue anyway - profile was cleared
    }

    return NextResponse.json({
      success: true,
      message: 'Disconnected from Wolf Waagen',
    })
  } catch (error) {
    console.error('Wolf Waagen disconnect error:', error)
    const message = error instanceof Error ? error.message : 'Disconnect failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
