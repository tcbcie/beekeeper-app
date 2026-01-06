import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { wolfGetScales } from '@/lib/wolf-waagen-api'

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
      return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 })
    }

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
