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

    // Get device ID, hive ID, period, and custom dates from query params
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')
    const hiveId = searchParams.get('hiveId')
    const period = searchParams.get('period') // 'hour' | 'day' | 'week' | 'month' | 'year' | 'custom'
    const customStart = searchParams.get('startDate')
    const customEnd = searchParams.get('endDate')

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID required' }, { status: 400 })
    }

    let beepApiToken: string | null = null

    if (hiveId) {
      // For shared hives: get the BEEP token from the hive owner
      const { data: hive, error: hiveError } = await supabaseAdmin
        .from('hives')
        .select('user_id, beep_device_id, apiary_id')
        .eq('id', hiveId)
        .single()

      if (hiveError || !hive) {
        return NextResponse.json({ error: 'Hive not found' }, { status: 404 })
      }

      // Verify user has access (is owner or has team access via apiary)
      const isOwner = hive.user_id === user.id
      if (!isOwner) {
        // Check if user has team access to this hive's apiary
        const { data: teamAccess } = await supabaseAdmin
          .from('team_apiaries')
          .select('id, teams!inner(team_members!inner(user_id))')
          .eq('apiary_id', hive.apiary_id)
          .eq('teams.team_members.user_id', user.id)
          .limit(1)

        if (!teamAccess || teamAccess.length === 0) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
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

    // Calculate date ranges for weight changes
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Fetch latest sensor values and historical data for weight changes in parallel
    const [lastValues, history24h, history7d, history30d] = await Promise.all([
      beepGetLastValues(beepApiToken, deviceId),
      beepGetMeasurements(beepApiToken, deviceId, oneDayAgo.toISOString(), now.toISOString()),
      beepGetMeasurements(beepApiToken, deviceId, sevenDaysAgo.toISOString(), now.toISOString()),
      beepGetMeasurements(beepApiToken, deviceId, thirtyDaysAgo.toISOString(), now.toISOString()),
    ])

    // Calculate 24h, 7-day and 30-day weight changes
    // Compare oldest reading in period to current weight from lastValues
    let weightChange24h: number | null = null
    let weightChange7d: number | null = null
    let weightChange30d: number | null = null

    const currentWeight = lastValues?.weight_kg_corrected ?? lastValues?.weight_kg

    if (history24h && history24h.length >= 1 && typeof currentWeight === 'number') {
      const oldestWeight = history24h[0]?.weight_kg_corrected ?? history24h[0]?.weight_kg
      if (typeof oldestWeight === 'number') {
        weightChange24h = currentWeight - oldestWeight
      }
    }

    if (history7d && history7d.length >= 1 && typeof currentWeight === 'number') {
      const oldestWeight = history7d[0]?.weight_kg_corrected ?? history7d[0]?.weight_kg
      if (typeof oldestWeight === 'number') {
        weightChange7d = currentWeight - oldestWeight
      }
    }

    if (history30d && history30d.length >= 1 && typeof currentWeight === 'number') {
      const oldestWeight = history30d[0]?.weight_kg_corrected ?? history30d[0]?.weight_kg
      if (typeof oldestWeight === 'number') {
        weightChange30d = currentWeight - oldestWeight
      }
    }

    let history = null
    if (period || (customStart && customEnd)) {
      const now = new Date()
      let startDate: Date
      let endDate: Date = now

      if (period === 'custom' && customStart && customEnd) {
        // Use custom date range
        startDate = new Date(customStart)
        endDate = new Date(customEnd)
        // Set end date to end of day
        endDate.setHours(23, 59, 59, 999)
      } else {
        // Calculate date range based on period
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
      }

      history = await beepGetMeasurements(
        beepApiToken,
        deviceId,
        startDate.toISOString(),
        endDate.toISOString()
      )
    }

    return NextResponse.json({
      lastValues,
      history,
      period,
      weightChange24h,
      weightChange7d,
      weightChange30d,
    })
  } catch (error) {
    console.error('BEEP data error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch sensor data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
