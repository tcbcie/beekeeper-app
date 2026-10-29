import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/api-auth'
import { wolfGetLastValues, wolfGetMeasurements, wolfGetBatteryVoltage, detectMaintenanceEvents, sumInterventions, WolfParsedReading } from '@/lib/wolf-waagen-api'
import { addDaysISO, dublinDayStartUtc, customRangeError } from '@/lib/dublin-date'

// The summary makes several Wolf calls one after another, each with retries: cap the run so a
// hanging Wolf server can't keep the function going for Vercel's full 5 minutes.
export const maxDuration = 90

export async function GET(request: NextRequest) {
  try {
    // Signed-in, active caller (src/lib/server/api-auth.ts)
    const auth = await requireUser(request, { requireActive: true })
    if ('response' in auth) return auth.response
    const { user, supabaseAdmin } = auth

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

    // Check custom dates before any Wolf call: a bad date used to fail only after 8 calls.
    if (period === 'custom') {
      const rangeError = customRangeError(customStart, customEnd)
      if (rangeError) return NextResponse.json({ error: rangeError }, { status: 400 })
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

      // The owner's token is used below, so only the scale assigned to this hive may be read.
      if (hive.wolf_scale_id !== scaleId) {
        return NextResponse.json({ error: 'This scale is not assigned to the hive' }, { status: 403 })
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

    // A chart asking for a period only reads the history, so skip the summary's vendor calls
    if (period || (customStart && customEnd)) {
      let history: WolfParsedReading[] = []
      const now = Math.floor(Date.now() / 1000)
      let startTimestamp: number
      let endTimestamp: number = now

      if (period === 'custom' && customStart && customEnd) {
        // Use custom date range: whole days in Ireland (the server runs in UTC, so a plain
        // date read here would start and end an hour late in summer)
        startTimestamp = Math.floor(dublinDayStartUtc(customStart).getTime() / 1000)
        // End of the end day: one millisecond before the next Irish midnight
        const endDate = new Date(dublinDayStartUtc(addDaysISO(customEnd.slice(0, 10), 1)).getTime() - 1)
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

      // Use daily resolution for longer periods (and custom ranges over a month)
      const longCustom = period === 'custom' && endTimestamp - startTimestamp > 31 * 24 * 60 * 60
      const resolution = (period === 'month' || period === 'year' || longCustom) ? 'daily' : 'hourly'

      try {
        history = await wolfGetMeasurements(
          wolfApiToken,
          scaleId,
          startTimestamp,
          endTimestamp,
          resolution
        )
      } catch (err) {
        console.warn('Wolf history fetch failed:', err)
        history = []
      }

      return NextResponse.json({ history, period })
    }

    // Fetch latest sensor values and historical data for weight changes
    // Execute sequentially with error handling to avoid rate limiting (429 errors)
    const now = Math.floor(Date.now() / 1000)
    const oneDayAgo = now - (24 * 60 * 60)
    const twoDaysAgo = now - (48 * 60 * 60)
    const sevenDaysAgo = now - (7 * 24 * 60 * 60)
    const fourteenDaysAgo = now - (14 * 24 * 60 * 60)
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60)
    const sixtyDaysAgo = now - (60 * 24 * 60 * 60)

    // Helper to calculate weight change from history array
    const calcWeightChange = (history: { weight_kg?: number }[]): number | null => {
      if (history.length >= 2) {
        const oldestWeight = history[0]?.weight_kg
        const newestWeight = history[history.length - 1]?.weight_kg
        if (typeof oldestWeight === 'number' && typeof newestWeight === 'number') {
          return newestWeight - oldestWeight
        }
      }
      return null
    }

    // Fetch essential data first (lastValues includes 24h data via yield_kg)
    let lastValues = null
    try {
      lastValues = await wolfGetLastValues(wolfApiToken, scaleId)
    } catch (err) {
      console.warn('Wolf lastValues fetch failed:', err)
    }

    // Fetch current and previous period histories for weight change comparisons
    let history7d: WolfParsedReading[] = []
    let history30d: WolfParsedReading[] = []
    let history48h: WolfParsedReading[] = []
    let historyPrev7d: WolfParsedReading[] = []
    let historyPrev30d: WolfParsedReading[] = []

    try {
      history7d = await wolfGetMeasurements(wolfApiToken, scaleId, sevenDaysAgo, now, 'daily')
    } catch (err) {
      console.warn('Wolf 7d history fetch failed:', err)
    }

    try {
      history30d = await wolfGetMeasurements(wolfApiToken, scaleId, thirtyDaysAgo, now, 'daily')
    } catch (err) {
      console.warn('Wolf 30d history fetch failed:', err)
    }

    // The last and previous 24 hours from one hourly series. Daily readings gave at most one
    // reading per 24 hours, so the previous-24h change could never be worked out.
    try {
      history48h = await wolfGetMeasurements(wolfApiToken, scaleId, twoDaysAgo, now, 'hourly')
    } catch (err) {
      console.warn('Wolf 48h history fetch failed:', err)
    }

    try {
      historyPrev7d = await wolfGetMeasurements(wolfApiToken, scaleId, fourteenDaysAgo, sevenDaysAgo, 'daily')
    } catch (err) {
      console.warn('Wolf prev 7d history fetch failed:', err)
    }

    try {
      historyPrev30d = await wolfGetMeasurements(wolfApiToken, scaleId, sixtyDaysAgo, thirtyDaysAgo, 'daily')
    } catch (err) {
      console.warn('Wolf prev 30d history fetch failed:', err)
    }

    // Battery voltage is optional
    let batteryVoltage: number | null = null
    try {
      batteryVoltage = await wolfGetBatteryVoltage(wolfApiToken, scaleId)
    } catch {
      // Battery endpoint may not be available for all scales
    }

    // Merge battery voltage into lastValues if available
    if (lastValues && batteryVoltage !== null) {
      lastValues.battery_voltage = batteryVoltage
    }

    // Split the 48 hours at "24 hours ago". The last-24h change used to be lastValues.yield_kg,
    // which is Wolf's change since the previous (hourly) reading, not over 24 hours.
    const readingTime = (r: WolfParsedReading) => Date.parse(r.time) / 1000
    const historyLast24h = history48h.filter(r => readingTime(r) >= oneDayAgo)
    const historyPrev24h = history48h.filter(r => readingTime(r) < oneDayAgo)

    // Calculate weight changes (adjusted to exclude maintenance events)
    const weightChange24h = calcWeightChange(historyLast24h)

    // Detect and subtract maintenance events (feeding, harvesting) from weight changes
    const interventions7d = sumInterventions(detectMaintenanceEvents(history7d))
    const interventions30d = sumInterventions(detectMaintenanceEvents(history30d))

    const rawWeightChange7d = calcWeightChange(history7d)
    const rawWeightChange30d = calcWeightChange(history30d)

    const weightChange7d = rawWeightChange7d !== null
      ? rawWeightChange7d - interventions7d
      : null
    const weightChange30d = rawWeightChange30d !== null
      ? rawWeightChange30d - interventions30d
      : null

    // Calculate previous period changes (shown in brackets for comparison)
    // Apply same maintenance event subtraction as current period values
    const prevWeightChange24h = calcWeightChange(historyPrev24h)

    const rawPrevWeightChange7d = calcWeightChange(historyPrev7d)
    const interventionsPrev7d = sumInterventions(detectMaintenanceEvents(historyPrev7d))
    const prevWeightChange7d = rawPrevWeightChange7d !== null
      ? rawPrevWeightChange7d - interventionsPrev7d
      : null

    const rawPrevWeightChange30d = calcWeightChange(historyPrev30d)
    const interventionsPrev30d = sumInterventions(detectMaintenanceEvents(historyPrev30d))
    const prevWeightChange30d = rawPrevWeightChange30d !== null
      ? rawPrevWeightChange30d - interventionsPrev30d
      : null

    return NextResponse.json({
      lastValues,
      history: null,
      period,
      weightChange24h,
      weightChange7d,
      weightChange30d,
      prevWeightChange24h,
      prevWeightChange7d,
      prevWeightChange30d,
    })
  } catch (error) {
    // Log the vendor's error server-side only; never pass its raw text to the browser.
    console.error('Wolf Waagen data error:', error)
    return NextResponse.json({ error: 'Failed to fetch sensor data' }, { status: 500 })
  }
}
