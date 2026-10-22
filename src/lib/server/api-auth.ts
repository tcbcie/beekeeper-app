import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

/**
 * Shared sign-in checks for API routes. Server code only: it uses the secret key.
 *
 * Every signed-in route used to repeat the same client setup and token check, and the copies
 * had drifted (three wordings for the same 401, and no check that the header really carries a
 * Bearer token). Routes now call `requireUser` or `requireAdmin` and return `auth.response`
 * when it is set.
 *
 * Not for routes with their own trust model: the cron job (cron secret), the Stripe webhook
 * (signature) and the public CSP report endpoint.
 */

let serviceClient: SupabaseClient | null = null

/** The one secret-key client. It bypasses RLS, so scope every query to the verified user. */
export function getServiceSupabase(): SupabaseClient {
  if (!serviceClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
    }
    serviceClient = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return serviceClient
}

export type AuthResult =
  // `token` is the caller's access token, for routes that act as the user (e.g. Mel's tools under RLS).
  | { user: User; supabaseAdmin: SupabaseClient; token: string }
  | { response: NextResponse }

const unauthorised = () => ({ response: NextResponse.json({ error: 'Unauthorised' }, { status: 401 }) })
const forbidden = (error: string) => ({ response: NextResponse.json({ error }, { status: 403 }) })

/**
 * The signed-in caller, from `Authorization: Bearer <token>`.
 * With `requireActive`, a deactivated account is refused (403). Leave it off only when the
 * route checks `is_active` in its own profile query.
 */
export async function requireUser(
  request: NextRequest | Request,
  options: { requireActive?: boolean } = {}
): Promise<AuthResult> {
  const header = request.headers.get('authorization') ?? ''
  const match = /^Bearer\s+(\S+)$/i.exec(header) // the scheme name is case-insensitive (RFC 7235)
  if (!match) return unauthorised()

  const supabaseAdmin = getServiceSupabase()
  const { data, error } = await supabaseAdmin.auth.getUser(match[1])
  if (error || !data.user) return unauthorised()

  if (options.requireActive) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_active')
      .eq('id', data.user.id)
      .single()
    if (profile?.is_active === false) return forbidden('Account is not active')
  }

  return { user: data.user, supabaseAdmin, token: match[1] }
}

/**
 * The signed-in caller, who must be an active Admin. A soft-deleted or deactivated admin loses
 * access at once, even while their token is still valid.
 */
export async function requireAdmin(request: NextRequest | Request): Promise<AuthResult> {
  const auth = await requireUser(request)
  if ('response' in auth) return auth

  const { data: profile, error } = await auth.supabaseAdmin
    .from('profiles')
    .select('role, is_active')
    .eq('id', auth.user.id)
    .single()
  if (error || !profile || profile.role !== 'Admin' || profile.is_active === false) {
    return forbidden('Admin access required')
  }
  return auth
}
