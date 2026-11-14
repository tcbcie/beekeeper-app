import * as Sentry from '@sentry/nextjs'
import { IMPERSONATION_KEY } from '@/lib/impersonation-key'
import { SENTRY_OPTIONS, withoutQuery } from '@/lib/sentry-options'

// Next.js runs this in the browser before the app starts. See docs/features/error-monitoring.md.

function impersonating(): boolean {
  try {
    return window.localStorage.getItem(IMPERSONATION_KEY) !== null
  } catch {
    return false
  }
}

Sentry.init({
  ...SENTRY_OPTIONS,
  // No signal is normal at an apiary, not a fault. Mirrors isConnectionFailure in inspection-outbox.
  ignoreErrors: [/abort|timeout|timed out|failed to fetch|load failed|network/i],
  beforeSend(event) {
    // An admin looking at a user's account: report nothing.
    if (impersonating()) return null
    if (event.request?.url) event.request.url = withoutQuery(event.request.url)
    return event
  },
  // Keep only the trail of screens and taps. Console output and requests can carry record details.
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category !== 'navigation' && breadcrumb.category !== 'ui.click') return null
    const data = breadcrumb.data
    if (data) {
      if (typeof data.from === 'string') data.from = withoutQuery(data.from)
      if (typeof data.to === 'string') data.to = withoutQuery(data.to)
    }
    return breadcrumb
  },
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
