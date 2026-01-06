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

    // Get device ID, hive ID, and period from query params
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')
    const hiveId = searchParams.get('hiveId')
    const period = searchParams.get('period') // 'hour' | 'day' | 'week' | 'month' | 'year'

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID required' }, { status: 400 })
    }

    let beepApiToken: string | null = null

    if (hiveId) {
      // For shared hives: get the BEEP token from the hive owner
      const { data: hive, error: hiveError } = await supabaseAdmin
        .from('hives')
        .select('user_id, beep_device_id, is_shared')
        .eq('id', hiveId)
        .single()

      if (hiveError || !hive) {
        return NextResponse.json({ error: 'Hive not found' }, { status: 404 })
      }

      // Verify user has access (is owner or hive is shared)
      const isOwner = hive.user_id === user.id
      if (!isOwner && !hive.is_shared) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      // Get BEEP token from hive owner's profile
      const { data: ownerProfile } = await supabaseAdmin
        .from('profiles')
        .select('beep_api_token')
        .eq('id', hive.user_id)
        .single()

      beepApiToken = ownerProfile?.beep_api_token || null
    } else {
      // Fallback: use current user's token (for owner viewing their own hive)
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('beep_api_token')
        .eq('id', user.id)
        .single()

      beepApiToken = profile?.beep_api_token || null
    }

    if (!beepApiToken) {
      return NextResponse.json({ error: 'BEEP not connected' }, { status: 400 })
    }

    // Fetch latest sensor values
    const lastValues = await beepGetLastValues(beepApiToken, deviceId)

    let history = null
    if (period) {
      // Calculate date range based on period
      const now = new Date()
      let startDate: Date

      switch (period) {
        case 'hour':
          startDate = new Date(now.getTime() - 60 * 60 * 1000)
          break
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000) // Default to day
      }

      history = await beepGetMeasurements(
        beepApiToken,
        deviceId,
        startDate.toISOString(),
        now.toISOString()
      )
    }

    return NextResponse.json({
      lastValues,
      history,
      period,
    })
  } catch (error) {
    console.error('BEEP data error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch sensor data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
