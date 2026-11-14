import * as Sentry from '@sentry/nextjs'

// The one door to error monitoring, so screens and routes never import Sentry themselves.
// Works in the browser and on the server. Never throws: reporting must not break the app.
// See docs/features/error-monitoring.md.

/**
 * Reports a fault that was caught and handled but that someone should know about.
 * `where` is a short fixed label (e.g. 'outbox-refused'), never user content.
 */
export function reportError(where: string, error: unknown): void {
  try {
    if (error instanceof Error) {
      Sentry.captureException(error, { tags: { where } })
      return
    }
    // Supabase errors are plain objects ({ message, code }), not Error instances.
    const plain = (error ?? {}) as { message?: unknown; code?: unknown }
    const message =
      typeof error === 'string' ? error : typeof plain.message === 'string' ? plain.message : 'Unknown error'
    const code = typeof plain.code === 'string' ? plain.code : undefined
    Sentry.captureException(new Error(message), { tags: code ? { where, code } : { where } })
  } catch {
    // Monitoring unavailable: nothing to do.
  }
}

/** Tags reports with the account id only (never email or name), so faults can be counted per user. */
export function setMonitoringUser(userId: string | null): void {
  try {
    Sentry.setUser(userId ? { id: userId } : null)
  } catch {
    // Monitoring unavailable: nothing to do.
  }
}
