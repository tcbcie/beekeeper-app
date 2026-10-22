import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/api-auth'

export async function POST(request: NextRequest) {
  try {
    // Signed-in, active caller (src/lib/server/api-auth.ts)
    const auth = await requireUser(request, { requireActive: true })
    if ('response' in auth) return auth.response
    const { user, supabaseAdmin } = auth

    // Clear Wolf Waagen token from profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        wolf_api_token: null,
        wolf_connected_at: null,
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('Failed to clear Wolf Waagen token:', profileError)
      console.warn(`[AUDIT] Wolf Waagen disconnect: user=${user.id} status=failed reason=clear_token timestamp=${new Date().toISOString()}`)
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
    }

    // Clear Wolf scale assignments from all user's hives
    const { error: hivesError } = await supabaseAdmin
      .from('hives')
      .update({
        wolf_scale_id: null,
        wolf_scale_name: null,
      })
      .eq('user_id', user.id)

    if (hivesError) {
      console.error('Failed to clear Wolf scale assignments:', hivesError)
      // Continue anyway - profile was cleared
    }

    console.warn(`[AUDIT] Wolf Waagen disconnect: user=${user.id} status=success timestamp=${new Date().toISOString()}`)

    return NextResponse.json({
      success: true,
      message: 'Disconnected from Wolf Waagen',
    })
  } catch (error) {
    console.error('Wolf Waagen disconnect error:', error)
    return NextResponse.json({ error: 'Disconnect failed' }, { status: 500 })
  }
}
