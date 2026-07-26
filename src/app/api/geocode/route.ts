import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Server-side Eircode/postcode geocoding.
 *
 * Google's Geocoding *web service* rejects API keys that carry HTTP-referrer restrictions
 * ("API keys with referer restrictions cannot be used with this API"), which is exactly how a
 * browser-exposed `NEXT_PUBLIC_` key would sensibly be locked down. Calling it from the server
 * sidesteps that entirely and keeps the key out of the client bundle, so it can be unrestricted
 * or IP-restricted instead.
 *
 * Prefers a server-only `GOOGLE_MAPS_API_KEY`; falls back to the existing public key so this keeps
 * working without new configuration.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('api/geocode: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type GeocodeFailure = 'not-configured' | 'denied' | 'not-found'

function failure(reason: GeocodeFailure, detail?: string) {
  return NextResponse.json({ ok: false, reason, detail: detail ?? null })
}

export async function GET(request: NextRequest) {
  // Authenticated only — this spends a metered third-party quota.
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const address = request.nextUrl.searchParams.get('address')?.trim()
  const country = request.nextUrl.searchParams.get('country') === 'GB' ? 'GB' : 'IE'
  if (!address) {
    return failure('not-found')
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return failure('not-configured', 'No Google Maps API key is configured on the server.')
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10_000)

    const response = await fetch(
      'https://maps.googleapis.com/maps/api/geocode/json' +
      `?address=${encodeURIComponent(address)}&components=country:${country}&key=${apiKey}`,
      { signal: controller.signal }
    )
    clearTimeout(timeoutId)

    const data = await response.json()
    const location = data?.results?.[0]?.geometry?.location

    if (data?.status === 'OK' && location) {
      return NextResponse.json({ ok: true, lat: String(location.lat), lon: String(location.lng) })
    }

    if (data?.status === 'REQUEST_DENIED' || data?.status === 'OVER_QUERY_LIMIT') {
      // Surfaced to the caller: these are deployment/config problems, not a bad postcode, and the
      // exact wording (invalid key, referer restrictions, API not enabled) is what makes them fixable.
      console.error('Google Geocoding rejected the request:', data.status, data.error_message)
      return failure('denied', data.error_message || data.status)
    }

    if (data?.status !== 'ZERO_RESULTS') {
      console.error('Google Geocoding error:', data?.status, data?.error_message)
    }
    return failure('not-found')
  } catch (error) {
    console.error('Geocoding request failed:', error)
    return failure('not-found')
  }
}
