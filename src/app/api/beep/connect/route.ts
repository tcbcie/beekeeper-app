import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { beepLogin } from '@/lib/beep-api'

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

    // Get BEEP credentials from request body
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    // Login to BEEP API
    const beepResponse = await beepLogin(email, password)

    // Store the API token in user's profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        beep_api_token: beepResponse.api_token,
        beep_connected_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to store BEEP token:', updateError)
      return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user: {
        name: beepResponse.user?.name || 'BEEP User',
        email: beepResponse.user?.email || email,
      },
    })
  } catch (error) {
    console.error('BEEP connect error:', error)
    const message = error instanceof Error ? error.message : 'Connection failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
