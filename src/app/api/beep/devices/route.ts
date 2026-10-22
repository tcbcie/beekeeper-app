import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/api-auth'
import { beepGetDevices } from '@/lib/beep-api'

export async function GET(request: NextRequest) {
  try {
    // Get auth token from request
    // Signed-in caller; is_active is checked in this route's own profile query below.
    const auth = await requireUser(request)
    if ('response' in auth) return auth.response
    const { user, supabaseAdmin } = auth

    // Get BEEP API token + is_active gate from user's profile in one query.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('beep_api_token, is_active')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    if (profile.is_active === false) {
      return NextResponse.json({ error: 'Account is not active' }, { status: 403 })
    }
    if (!profile.beep_api_token) {
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
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 })
  }
}
