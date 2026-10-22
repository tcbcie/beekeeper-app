import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/api-auth'

export async function POST(request: NextRequest) {
  try {
    // Signed-in, active caller (src/lib/server/api-auth.ts)
    const auth = await requireUser(request, { requireActive: true })
    if ('response' in auth) return auth.response
    const { user, supabaseAdmin } = auth

    // Clear BEEP token from profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        beep_api_token: null,
        beep_connected_at: null,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to clear BEEP token:', updateError)
      console.warn(`[AUDIT] BEEP disconnect: user=${user.id} status=failed reason=clear_token timestamp=${new Date().toISOString()}`)
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
    }

    // Also clear device assignments from all user's hives
    await supabaseAdmin
      .from('hives')
      .update({
        beep_device_id: null,
        beep_device_name: null,
      })
      .eq('user_id', user.id)

    console.warn(`[AUDIT] BEEP disconnect: user=${user.id} status=success timestamp=${new Date().toISOString()}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('BEEP disconnect error:', error)
    return NextResponse.json({ error: 'Disconnect failed' }, { status: 500 })
  }
}
