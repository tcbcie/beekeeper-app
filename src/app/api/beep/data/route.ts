import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { beepGetLastValues, beepGetMeasurements } from '@/lib/beep-api'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: NextRequest) {
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

    // Get device ID from query params
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')
    const includeHistory = searchParams.get('history') === 'true'

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID required' }, { status: 400 })
    }

    // Get BEEP API token from user's profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('beep_api_token')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.beep_api_token) {
      return NextResponse.json({ error: 'BEEP not connected' }, { status: 400 })
    }

    // Fetch latest sensor values
    const lastValues = await beepGetLastValues(profile.beep_api_token, deviceId)

    let history = null
    if (includeHistory) {
      // Fetch last 7 days of data
      const endDate = new Date().toISOString()
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      history = await beepGetMeasurements(profile.beep_api_token, deviceId, startDate, endDate)
    }

    return NextResponse.json({
      lastValues,
      history,
    })
  } catch (error) {
    console.error('BEEP data error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch sensor data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
