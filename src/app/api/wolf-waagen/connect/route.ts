import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { wolfGetScales } from '@/lib/wolf-waagen-api'

// Fail-fast at module init.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'wolf-waagen/connect: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
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

    // Get API token from request body
    const body = await request.json()
    const { apiToken } = body

    if (!apiToken) {
      return NextResponse.json({ error: 'API token is required' }, { status: 400 })
    }

    // Validate the token by trying to fetch scales
    let scales
    try {
      scales = await wolfGetScales(apiToken)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid API token'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    // Store the token in the user's profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        wolf_api_token: apiToken,
        wolf_connected_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to store Wolf Waagen token:', updateError)
      console.warn(`[AUDIT] Wolf Waagen connect: user=${user.id} status=failed reason=store_token timestamp=${new Date().toISOString()}`)
      return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 })
    }

    console.warn(`[AUDIT] Wolf Waagen connect: user=${user.id} scales=${scales.length} status=success timestamp=${new Date().toISOString()}`)

    return NextResponse.json({
      success: true,
      scaleCount: scales.length,
      message: `Connected to Wolf Waagen with ${scales.length} scale(s)`,
    })
  } catch (error) {
    console.error('Wolf Waagen connect error:', error)
    const message = error instanceof Error ? error.message : 'Connection failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
