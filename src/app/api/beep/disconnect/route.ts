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

    // Clear BEEP token from profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        beep_api_token: null,
        beep_connected_at: null,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to clear BEEP token:', updateError)
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
    }

    // Also clear device assignments from all user's hives
    await supabaseAdmin
      .from('hives')
      .update({
        beep_device_id: null,
        beep_device_name: null,
      })
      .eq('user_id', user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('BEEP disconnect error:', error)
    return NextResponse.json({ error: 'Disconnect failed' }, { status: 500 })
  }
}
