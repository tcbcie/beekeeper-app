import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { beepLogin } from '@/lib/beep-api'

// Fail-fast at module init.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'beep/connect: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
  )
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

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

    // Gate on is_active. A soft-deleted account must not be able to store
    // a fresh external-API token under their profile.
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('is_active')
      .eq('id', user.id)
      .single()
    if (callerProfile?.is_active === false) {
      return NextResponse.json({ error: 'Account is not active' }, { status: 403 })
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
      console.warn(`[AUDIT] BEEP connect: user=${user.id} status=failed reason=store_token timestamp=${new Date().toISOString()}`)
      return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 })
    }

    console.warn(`[AUDIT] BEEP connect: user=${user.id} status=success timestamp=${new Date().toISOString()}`)

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
