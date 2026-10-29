import { NextRequest, NextResponse } from 'next/server'
import { requireUser, readJsonBody, MALFORMED_BODY } from '@/lib/server/api-auth'
import { consumeRateLimits, RATE_LIMITS } from '@/lib/rate-limit'
import { beepLogin } from '@/lib/beep-api'

export async function POST(request: NextRequest) {
  try {
    // Signed-in, active caller (src/lib/server/api-auth.ts)
    const auth = await requireUser(request, { requireActive: true })
    if ('response' in auth) return auth.response
    const { user, supabaseAdmin } = auth

    // Get BEEP credentials from request body
    const body = await readJsonBody<{ email?: string; password?: string }>(request)
    if (!body) return NextResponse.json({ error: MALFORMED_BODY }, { status: 400 })
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    if (!(await consumeRateLimits(supabaseAdmin, user.id, [RATE_LIMITS.scaleConnect]))) {
      return NextResponse.json(
        { error: 'Too many connection attempts. Please wait an hour and try again.' },
        { status: 429 }
      )
    }

    // Login to BEEP API
    const beepResponse = await beepLogin(email, password)

    // Store the API token in user's profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        beep_api_token: beepResponse.api_token,
        beep_connected_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to store BEEP token:', updateError)
      console.warn(`[AUDIT] BEEP connect: user=${user.id} status=failed reason=store_token timestamp=${new Date().toISOString()}`)
      return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 })
    }

    console.warn(`[AUDIT] BEEP connect: user=${user.id} status=success timestamp=${new Date().toISOString()}`)

    return NextResponse.json({
      success: true,
      user: {
        name: beepResponse.user?.name || 'BEEP User',
        email: beepResponse.user?.email || email,
      },
    })
  } catch (error) {
    // Details stay in the log; never echo BEEP's response back to the browser.
    console.error('BEEP connect error:', error)
    return NextResponse.json(
      { error: 'Could not connect to BEEP. Check your email and password.' },
      { status: 400 }
    )
  }
}
