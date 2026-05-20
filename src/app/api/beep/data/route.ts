import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { beepGetLastValues, beepGetMeasurements } from '@/lib/beep-api'

// Fail-fast at module init.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'beep/data: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
  )
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

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

    // Gate on is_active. Soft-deleted callers must lose access.
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('is_active')
      .eq('id', user.id)
      .single()
    if (callerProfile?.is_active === false) {
      return NextResponse.json({ error: 'Account is not active' }, { status: 403 })
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

    // Calculate date ranges for weight changes (current and previous periods)
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    // Fetch latest sensor values and historical data for weight changes in parallel
    const [lastValues, history24h, historyPrev24h, history7d, historyPrev7d, history30d, historyPrev30d] = await Promise.all([
      beepGetLastValues(beepApiToken, deviceId),
      beepGetMeasurements(beepApiToken, deviceId, oneDayAgo.toISOString(), now.toISOString()),
      beepGetMeasurements(beepApiToken, deviceId, twoDaysAgo.toISOString(), oneDayAgo.toISOString()),
      beepGetMeasurements(beepApiToken, deviceId, sevenDaysAgo.toISOString(), now.toISOString()),
      beepGetMeasurements(beepApiToken, deviceId, fourteenDaysAgo.toISOString(), sevenDaysAgo.toISOString()),
      beepGetMeasurements(beepApiToken, deviceId, thirtyDaysAgo.toISOString(), now.toISOString()),
      beepGetMeasurements(beepApiToken, deviceId, sixtyDaysAgo.toISOString(), thirtyDaysAgo.toISOString()),
    ])

    // Calculate 24h, 7-day and 30-day weight changes (current and previous periods)
    // Compare oldest reading in period to newest reading in that period
    let weightChange24h: number | null = null
    let weightChange7d: number | null = null
    let weightChange30d: number | null = null
    let prevWeightChange24h: number | null = null
    let prevWeightChange7d: number | null = null
    let prevWeightChange30d: number | null = null

    const currentWeight = lastValues?.weight_kg_corrected ?? lastValues?.weight_kg

    // Helper to find oldest reading with valid weight
    const findOldestWeight = (readings: typeof history24h): number | null => {
      if (!readings) return null
      for (const r of readings) {
        const w = r.weight_kg_corrected ?? r.weight_kg
        if (typeof w === 'number') return w
      }
      return null
    }

    // Helper to find newest reading with valid weight
    const findNewestWeight = (readings: typeof history24h): number | null => {
      if (!readings) return null
      for (let i = readings.length - 1; i >= 0; i--) {
        const w = readings[i].weight_kg_corrected ?? readings[i].weight_kg
        if (typeof w === 'number') return w
      }
      return null
    }

    if (typeof currentWeight === 'number') {
      const oldest24h = findOldestWeight(history24h)
      if (oldest24h !== null) {
        weightChange24h = currentWeight - oldest24h
      }

      const oldest7d = findOldestWeight(history7d)
      if (oldest7d !== null) {
        weightChange7d = currentWeight - oldest7d
      }

      const oldest30d = findOldestWeight(history30d)
      if (oldest30d !== null) {
        weightChange30d = currentWeight - oldest30d
      }
    }

    // Calculate previous period changes
    const oldestPrev24h = findOldestWeight(historyPrev24h)
    const newestPrev24h = findNewestWeight(historyPrev24h)
    if (oldestPrev24h !== null && newestPrev24h !== null) {
      prevWeightChange24h = newestPrev24h - oldestPrev24h
    }

    const oldestPrev7d = findOldestWeight(historyPrev7d)
    const newestPrev7d = findNewestWeight(historyPrev7d)
    if (oldestPrev7d !== null && newestPrev7d !== null) {
      prevWeightChange7d = newestPrev7d - oldestPrev7d
    }

    const oldestPrev30d = findOldestWeight(historyPrev30d)
    const newestPrev30d = findNewestWeight(historyPrev30d)
    if (oldestPrev30d !== null && newestPrev30d !== null) {
      prevWeightChange30d = newestPrev30d - oldestPrev30d
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
      prevWeightChange24h,
      prevWeightChange7d,
      prevWeightChange30d,
    })
  } catch (error) {
    console.error('BEEP data error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch sensor data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
