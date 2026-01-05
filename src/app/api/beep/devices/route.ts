import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { beepGetDevices } from '@/lib/beep-api'

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

    // Get BEEP API token from user's profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('beep_api_token')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.beep_api_token) {
      return NextResponse.json({ error: 'BEEP not connected' }, { status: 400 })
    }

    // Fetch devices from BEEP API
    const devices = await beepGetDevices(profile.beep_api_token)

    // Also get which devices are already assigned to user's hives
    const { data: hives } = await supabaseAdmin
      .from('hives')
      .select('id, hive_number, beep_device_id, apiaries(name)')
      .eq('user_id', user.id)
      .not('beep_device_id', 'is', null)

    interface HiveWithApiary {
      id: string
      hive_number: string
      beep_device_id: string | null
      apiaries: { name: string } | null
    }

    const assignedDevices = new Map(
      (hives as HiveWithApiary[] | null)?.map(h => [h.beep_device_id, { hiveId: h.id, hiveNumber: h.hive_number, apiaryName: h.apiaries?.name }]) || []
    )

    // Enrich devices with assignment info
    const enrichedDevices = devices.map(device => ({
      ...device,
      assigned_to: assignedDevices.get(String(device.id)) || null,
    }))

    return NextResponse.json({ devices: enrichedDevices })
  } catch (error) {
    console.error('BEEP devices error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch devices'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
