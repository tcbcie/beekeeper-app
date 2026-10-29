import { NextRequest, NextResponse } from 'next/server'
import { requireUser, readJsonBody, MALFORMED_BODY } from '@/lib/server/api-auth'
import { consumeRateLimits, RATE_LIMITS } from '@/lib/rate-limit'
import { wolfGetScales } from '@/lib/wolf-waagen-api'

export async function POST(request: NextRequest) {
  try {
    // Signed-in, active caller (src/lib/server/api-auth.ts)
    const auth = await requireUser(request, { requireActive: true })
    if ('response' in auth) return auth.response
    const { user, supabaseAdmin } = auth

    // Get API token from request body
    const body = await readJsonBody<{ apiToken?: string }>(request)
    if (!body) return NextResponse.json({ error: MALFORMED_BODY }, { status: 400 })
    const { apiToken } = body

    if (!apiToken) {
      return NextResponse.json({ error: 'API token is required' }, { status: 400 })
    }

    if (!(await consumeRateLimits(supabaseAdmin, user.id, [RATE_LIMITS.scaleConnect]))) {
      return NextResponse.json(
        { error: 'Too many connection attempts. Please wait an hour and try again.' },
        { status: 429 }
      )
    }

    // Validate the token by trying to fetch scales
    let scales
    try {
      scales = await wolfGetScales(apiToken)
    } catch (err) {
      console.error('Wolf Waagen token check failed:', err)
      return NextResponse.json(
        { error: 'Could not connect to Wolf Waagen. Check your API token.' },
        { status: 400 }
      )
    }

    // Store the token in the user's profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        wolf_api_token: apiToken,
        wolf_connected_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to store Wolf Waagen token:', updateError)
      console.warn(`[AUDIT] Wolf Waagen connect: user=${user.id} status=failed reason=store_token timestamp=${new Date().toISOString()}`)
      return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 })
    }

    console.warn(`[AUDIT] Wolf Waagen connect: user=${user.id} scales=${scales.length} status=success timestamp=${new Date().toISOString()}`)

    return NextResponse.json({
      success: true,
      scaleCount: scales.length,
      message: `Connected to Wolf Waagen with ${scales.length} scale(s)`,
    })
  } catch (error) {
    console.error('Wolf Waagen connect error:', error)
    return NextResponse.json({ error: 'Connection failed' }, { status: 500 })
  }
}
