import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/server/api-auth'

// TEMPORARY (added 14/11/2026): proves that a server error reaches Sentry with readable code.
// Remove once the test report has been seen. See docs/features/error-monitoring.md.
// POST only, admins only. The error is thrown on purpose and left uncaught, so it travels the
// same path as a real fault (onRequestError in src/instrumentation.ts).
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('response' in auth) return auth.response

  throw new Error(`Sentry test error ${new Date().toISOString()}`)
}
