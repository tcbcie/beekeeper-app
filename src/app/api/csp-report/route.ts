import { NextRequest, NextResponse } from 'next/server'

/**
 * Receives Content-Security-Policy violation reports (the `report-uri` in next.config.ts) and
 * writes one short line per report to the server log, so the policy can be checked before it
 * is enforced. Public by necessity (browsers post without auth), so it only logs a few capped
 * fields, strips query strings and fragments, and never echoes anything back.
 */

const MAX_BODY_BYTES = 16 * 1024
const MAX_FIELD_LENGTH = 300

// Drop query strings and fragments (they can carry tokens or personal data) and cap the length.
function cleanUrl(value: unknown): string {
  if (typeof value !== 'string' || !value) return '-'
  let cleaned = value
  try {
    const url = new URL(value)
    cleaned = url.origin === 'null' ? url.protocol : `${url.origin}${url.pathname}`
  } catch {
    // Not a URL (e.g. 'inline', 'eval', 'data'): keep as is.
  }
  return cleaned.slice(0, MAX_FIELD_LENGTH)
}

function cleanText(value: unknown): string {
  return typeof value === 'string' && value ? value.slice(0, MAX_FIELD_LENGTH) : '-'
}

export async function POST(request: NextRequest) {
  const declaredLength = Number(request.headers.get('content-length') || 0)
  if (declaredLength > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413 })
  }

  try {
    const body = (await request.text()).slice(0, MAX_BODY_BYTES)
    const parsed = JSON.parse(body) as { 'csp-report'?: Record<string, unknown> }
    const report = parsed?.['csp-report']
    if (report && typeof report === 'object') {
      console.warn(
        `[CSP] directive=${cleanText(report['effective-directive'] ?? report['violated-directive'])}` +
        ` blocked=${cleanUrl(report['blocked-uri'])}` +
        ` page=${cleanUrl(report['document-uri'])}` +
        ` source=${cleanUrl(report['source-file'])}:${cleanText(String(report['line-number'] ?? '-'))}`
      )
    }
  } catch {
    // Malformed report: ignore.
  }

  return new NextResponse(null, { status: 204 })
}
