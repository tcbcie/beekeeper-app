import type { SupabaseClient } from '@supabase/supabase-js'

/** One limit: at most `limit` calls per `windowSeconds`, counted per user and bucket. */
export interface RateLimit {
  bucket: string
  limit: number
  windowSeconds: number
}

const HOUR = 3600
const DAY = 86400

/** Per-user limits for routes that spend money on paid third-party services. */
export const RATE_LIMITS = {
  chatHourly: { bucket: 'chat', limit: 30, windowSeconds: HOUR },
  chatDaily: { bucket: 'chat_daily', limit: 150, windowSeconds: DAY },
  voiceHourly: { bucket: 'voice', limit: 20, windowSeconds: HOUR },
  voiceDaily: { bucket: 'voice_daily', limit: 60, windowSeconds: DAY },
  newsSearch: { bucket: 'news_search', limit: 60, windowSeconds: HOUR },
  geocode: { bucket: 'geocode', limit: 60, windowSeconds: HOUR },
  invoiceEmail: { bucket: 'invoice_email', limit: 25, windowSeconds: HOUR },
  // BEEP / Wolf connect: stops the routes being used to test credentials against the vendors.
  scaleConnect: { bucket: 'scale_connect', limit: 5, windowSeconds: HOUR },
  // Shared with the lookup_registration_code / activate_subscription database functions.
  codeAttempt: { bucket: 'code_attempt', limit: 20, windowSeconds: HOUR },
} satisfies Record<string, RateLimit>

/**
 * Record one call against each limit, in order, and report whether all of them allowed it.
 * Uses the database's `consume_rate_limit`, which counts and records atomically, so parallel
 * requests can't slip past. Fails closed: if the check itself errors, the call is refused.
 * `supabaseAdmin` must be a secret-key client (the function isn't callable by users).
 */
export async function consumeRateLimits(
  supabaseAdmin: SupabaseClient,
  userId: string,
  limits: RateLimit[],
): Promise<boolean> {
  for (const { bucket, limit, windowSeconds } of limits) {
    const { data, error } = await supabaseAdmin.rpc('consume_rate_limit', {
      p_user_id: userId,
      p_bucket: bucket,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })
    if (error) {
      console.error(`Rate limit check failed (${bucket}):`, error.message)
      return false
    }
    if (data !== true) return false
  }
  return true
}

export const RATE_LIMITED_MESSAGE =
  'You have reached the usage limit for this feature. Please try again later.'
