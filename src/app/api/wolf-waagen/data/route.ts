import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { wolfGetLastValues, wolfGetMeasurements, wolfGetBatteryVoltage } from '@/lib/wolf-waagen-api'

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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const scaleId = searchParams.get('scaleId')
    const hiveId = searchParams.get('hiveId')
    const period = searchParams.get('period') // 'hour' | 'day' | 'week' | 'month' | 'year' | 'custom'
    const customStart = searchParams.get('startDate')
    const customEnd = searchParams.get('endDate')

    if (!scaleId) {
      return NextResponse.json({ error: 'Scale ID required' }, { status: 400 })
    }

    let wolfApiToken: string | null = null

    if (hiveId) {
      // For shared hives: get the Wolf token from the hive owner
      const { data: hive, error: hiveError } = await supabaseAdmin
        .from('hives')
        .select('user_id, wolf_scale_id, apiary_id')
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

      // Get Wolf token from hive owner's profile
      const { data: ownerProfile } = await supabaseAdmin
        .from('profiles')
        .select('wolf_api_token')
        .eq('id', hive.user_id)
        .single()

      wolfApiToken = ownerProfile?.wolf_api_token || null
    } else {
      // Use current user's token
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('wolf_api_token')
        .eq('id', user.id)
        .single()

      wolfApiToken = profile?.wolf_api_token || null
    }

    if (!wolfApiToken) {
      return NextResponse.json({ error: 'Wolf Waagen not connected' }, { status: 400 })
    }

    // Fetch latest sensor values, battery voltage, and historical data for weight changes
    const now = Math.floor(Date.now() / 1000)
    const sevenDaysAgo = now - (7 * 24 * 60 * 60)
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60)

    const [lastValues, batteryVoltage, history7d, history30d] = await Promise.all([
      wolfGetLastValues(wolfApiToken, scaleId),
      wolfGetBatteryVoltage(wolfApiToken, scaleId),
      wolfGetMeasurements(wolfApiToken, scaleId, sevenDaysAgo, now, 'daily'),
      wolfGetMeasurements(wolfApiToken, scaleId, thirtyDaysAgo, now, 'daily'),
    ])

    // Merge battery voltage into lastValues if available
    if (lastValues && batteryVoltage !== null) {
      lastValues.battery_voltage = batteryVoltage
    }

    // Calculate 7-day and 30-day weight changes
    let weightChange7d: number | null = null
    let weightChange30d: number | null = null

    if (history7d.length >= 2) {
      const oldestWeight = history7d[0]?.weight_kg
      const newestWeight = history7d[history7d.length - 1]?.weight_kg
      if (typeof oldestWeight === 'number' && typeof newestWeight === 'number') {
        weightChange7d = newestWeight - oldestWeight
      }
    }

    if (history30d.length >= 2) {
      const oldestWeight = history30d[0]?.weight_kg
      const newestWeight = history30d[history30d.length - 1]?.weight_kg
      if (typeof oldestWeight === 'number' && typeof newestWeight === 'number') {
        weightChange30d = newestWeight - oldestWeight
      }
    }

    let history = null
    if (period || (customStart && customEnd)) {
      const now = Math.floor(Date.now() / 1000)
      let startTimestamp: number
      let endTimestamp: number = now

      if (period === 'custom' && customStart && customEnd) {
        // Use custom date range
        startTimestamp = Math.floor(new Date(customStart).getTime() / 1000)
        const endDate = new Date(customEnd)
        endDate.setHours(23, 59, 59, 999)
        endTimestamp = Math.floor(endDate.getTime() / 1000)
      } else {
        // Calculate date range based on period
        switch (period) {
          case 'hour':
            startTimestamp = now - (60 * 60)
            break
          case 'day':
            startTimestamp = now - (24 * 60 * 60)
            break
          case 'week':
            startTimestamp = now - (7 * 24 * 60 * 60)
            break
          case 'month':
            startTimestamp = now - (30 * 24 * 60 * 60)
            break
          case 'year':
            startTimestamp = now - (365 * 24 * 60 * 60)
            break
          default:
            startTimestamp = now - (24 * 60 * 60) // Default to day
        }
      }

      // Use daily resolution for longer periods
      const resolution = (period === 'month' || period === 'year') ? 'daily' : 'hourly'

      history = await wolfGetMeasurements(
        wolfApiToken,
        scaleId,
        startTimestamp,
        endTimestamp,
        resolution
      )
    }

    return NextResponse.json({
      lastValues,
      history,
      period,
      weightChange7d,
      weightChange30d,
    })
  } catch (error) {
    console.error('Wolf Waagen data error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch sensor data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
