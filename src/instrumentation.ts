import * as Sentry from '@sentry/nextjs'

// Next.js runs this once when the server starts. Every route runs on Node.js (no edge runtime).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
}

// Reports any error a server route or page throws without catching it.
export const onRequestError = Sentry.captureRequestError
