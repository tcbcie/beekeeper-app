// Shared helpers for admin endpoints that fetch user-supplied URLs.
//
// Used by /api/admin/news-articles and /api/admin/knowledge-base. Both routes
// accept a URL from an admin, fetch it, and pass the HTML through cheerio.
// Two safety levers live here so they cannot drift between the two callers:
//
// 1. assertSafePublicUrl  -- SSRF guard. Rejects non-HTTPS, loopback,
//    .local, RFC1918, and 169.254.* (cloud metadata) targets.
// 2. fetchHtmlWithBounds  -- request with explicit timeout AND a streamed
//    body-size cap, so an adversarial server cannot OOM the function with a
//    multi-hundred-megabyte response.

const DEFAULT_FETCH_TIMEOUT_MS = 30_000
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024  // 5 MB
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (compatible; HiveCraic/1.0; +https://hivecraic.com)'

export function assertSafePublicUrl(
  rawUrl: string
): { ok: true; url: URL } | { ok: false; reason: string } {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return { ok: false, reason: 'Invalid URL format' }
  }
  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: 'Only HTTPS URLs are allowed' }
  }
  const hostname = parsed.hostname.toLowerCase()
  const isPrivate =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('169.254.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  if (isPrivate) {
    return { ok: false, reason: 'Internal/private URLs are not allowed' }
  }
  return { ok: true, url: parsed }
}

export interface FetchBoundsOptions {
  timeoutMs?: number
  maxBytes?: number
  userAgent?: string
}

export class FetchTooLargeError extends Error {
  constructor(public readonly maxBytes: number) {
    super(`Response exceeds ${maxBytes} bytes`)
    this.name = 'FetchTooLargeError'
  }
}

// Fetches the given URL as HTML/text with two hard ceilings:
//   - request timeout (AbortController)
//   - response body byte cap (Content-Length pre-check + streamed read)
// Throws on non-2xx, timeout, or oversize.
export async function fetchHtmlWithBounds(
  url: string,
  options: FetchBoundsOptions = {}
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': userAgent }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`)
    }

    // Cheap pre-check: if the server advertises Content-Length larger than
    // our cap, refuse without consuming the body.
    const contentLengthHeader = response.headers.get('content-length')
    if (contentLengthHeader) {
      const declared = Number.parseInt(contentLengthHeader, 10)
      if (Number.isFinite(declared) && declared > maxBytes) {
        throw new FetchTooLargeError(maxBytes)
      }
    }

    // Stream-read with a running byte counter so a server that lies about
    // (or omits) Content-Length cannot bypass the cap.
    if (!response.body) {
      // No streamable body (shouldn't happen with fetch but be defensive).
      const text = await response.text()
      if (text.length > maxBytes) {
        throw new FetchTooLargeError(maxBytes)
      }
      return text
    }

    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let received = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          received += value.byteLength
          if (received > maxBytes) {
            await reader.cancel()
            throw new FetchTooLargeError(maxBytes)
          }
          chunks.push(value)
        }
      }
    } finally {
      reader.releaseLock?.()
    }

    return Buffer.concat(chunks.map(c => Buffer.from(c))).toString('utf-8')
  } finally {
    clearTimeout(timeoutId)
  }
}

// Wraps a synchronous-ish CPU-bound promise (e.g. pdf-parse) with a deadline.
// Note: the underlying work continues until natural completion -- this just
// surfaces a timeout error to the caller. Use for libraries that lack their
// own cancellation. The serverless function timeout is the ultimate stop.
export async function withDeadline<T>(
  task: Promise<T>,
  deadlineMs: number,
  label: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      task,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${deadlineMs}ms`)), deadlineMs)
      })
    ])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
