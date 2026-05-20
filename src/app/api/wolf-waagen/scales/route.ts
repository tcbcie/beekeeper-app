import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { wolfGetScales } from '@/lib/wolf-waagen-api'

// Fail-fast at module init.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'wolf-waagen/scales: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
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

    // Get Wolf Waagen API token + is_active gate from user's profile.
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('wolf_api_token, is_active')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    if (profile.is_active === false) {
      return NextResponse.json({ error: 'Account is not active' }, { status: 403 })
    }
    if (!profile.wolf_api_token) {
      return NextResponse.json({ error: 'Wolf Waagen not connected' }, { status: 400 })
    }

    // Fetch scales from Wolf Waagen API
    const scales = await wolfGetScales(profile.wolf_api_token)

    // Get current scale assignments from user's hives
    const { data: hives } = await supabaseAdmin
      .from('hives')
      .select('id, hive_number, wolf_scale_id, apiaries(name)')
      .eq('user_id', user.id)
      .not('wolf_scale_id', 'is', null)

    // Create a map of scale ID to hive info
    const assignmentMap = new Map<string, { hiveId: string; hiveNumber: string; apiaryName: string }>()
    if (hives) {
      for (const hive of hives) {
        if (hive.wolf_scale_id) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const apiaryData = hive.apiaries as any
          const apiaryName = apiaryData?.name || 'Unknown'
          assignmentMap.set(hive.wolf_scale_id, {
            hiveId: hive.id,
            hiveNumber: hive.hive_number,
            apiaryName,
          })
        }
      }
    }

    // Enrich scales with assignment info
    const enrichedScales = scales.map(scale => ({
      ...scale,
      assigned_to: assignmentMap.get(scale.scale_id) || null,
    }))

    return NextResponse.json({
      scales: enrichedScales,
    })
  } catch (error) {
    console.error('Wolf Waagen scales error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch scales'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
