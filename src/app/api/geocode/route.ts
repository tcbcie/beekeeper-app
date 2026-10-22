import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/api-auth'
import { consumeRateLimits, RATE_LIMITS } from '@/lib/rate-limit'

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
type GeocodeFailure = 'not-configured' | 'denied' | 'not-found'

const MAX_ADDRESS_LENGTH = 200
const REQUEST_TIMEOUT_MS = 10_000

function failure(reason: GeocodeFailure, detail?: string, status = 200) {
  return NextResponse.json({ ok: false, reason, detail: detail ?? null }, { status })
}

export async function GET(request: NextRequest) {
  // Authenticated only — this spends a metered third-party quota.
  const auth = await requireUser(request, { requireActive: true })
  if ('response' in auth) return auth.response
  const { user, supabaseAdmin } = auth

  const address = request.nextUrl.searchParams.get('address')?.trim()
  const country = request.nextUrl.searchParams.get('country') === 'GB' ? 'GB' : 'IE'
  // A postcode or town name is short; anything longer is not a real lookup and should not be
  // forwarded to a metered upstream service.
  if (!address || address.length > MAX_ADDRESS_LENGTH) {
    return failure('not-found')
  }

  // Over the limit, report not-found so the page falls back to its free city-level lookup.
  if (!(await consumeRateLimits(supabaseAdmin, user.id, [RATE_LIMITS.geocode]))) {
    return failure('not-found', 'Geocoding limit reached', 429)
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return failure('not-configured', 'No Google Maps API key is configured on the server.')
  }

  // Declared outside the try so the timer is always cleared, including when fetch itself rejects.
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(
      'https://maps.googleapis.com/maps/api/geocode/json' +
      `?address=${encodeURIComponent(address)}&components=country:${country}&key=${apiKey}`,
      { signal: controller.signal }
    )

    const data = await response.json()
    const location = data?.results?.[0]?.geometry?.location

    if (data?.status === 'OK' && location) {
      return NextResponse.json({ ok: true, lat: String(location.lat), lon: String(location.lng) })
    }

    if (data?.status === 'REQUEST_DENIED' || data?.status === 'OVER_QUERY_LIMIT') {
      // A deployment/config problem, not a bad postcode. Google's exact wording (invalid key,
      // referer restrictions, API not enabled) goes to the server log, not to the browser.
      console.error('Google Geocoding rejected the request:', data.status, data.error_message)
      return failure('denied', 'details are in the server log')
    }

    if (data?.status !== 'ZERO_RESULTS') {
      console.error('Google Geocoding error:', data?.status, data?.error_message)
    }
    return failure('not-found')
  } catch (error) {
    console.error('Geocoding request failed:', error)
    return failure('not-found')
  } finally {
    clearTimeout(timeoutId)
  }
}
