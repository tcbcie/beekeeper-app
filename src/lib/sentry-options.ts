// Error monitoring (Sentry, EU region): settings shared by the browser and the server.
// See docs/features/error-monitoring.md.
//
// Errors only. Everything the library would collect about the person or the request is switched
// off here; the only identity sent is the account id set by setMonitoringUser().
export const SENTRY_OPTIONS = {
  // No address, no reports: local runs and previews without the setting stay silent.
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  environment: process.env.NEXT_PUBLIC_DEPLOY_ENV,
  initialScope: { tags: { app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown' } },
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    databaseQueryData: false,
    stackFrameVariables: false,
    queues: false,
    genAI: { inputs: false, outputs: false },
  },
}

/** Invitation, password-reset and sign-in links carry tokens after the "?" or "#". */
export function withoutQuery(url: string): string {
  return url.split(/[?#]/)[0]
}
