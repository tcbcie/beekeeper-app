// Shared helpers for admin endpoints that fetch user-supplied URLs.
//
// Used by /api/admin/news-articles and /api/admin/knowledge-base. Both routes
// accept a URL from an admin, fetch it, and pass the HTML through cheerio.
// Two safety levers live here so they cannot drift between the two callers:
//
// 1. assertSafePublicUrl  -- SSRF guard. Rejects non-HTTPS, localhost/.local and
//    any IP literal in a private, loopback, link-local (cloud metadata),
//    carrier-grade NAT or IPv6 private range. The URL parser normalises decimal
//    and hex IPv4 ("https://2130706433") to dotted form first, so those are caught.
// 2. fetchHtmlWithBounds  -- resolves the hostname and refuses private addresses,
//    follows redirects itself (re-checking every hop), with an explicit timeout
//    AND a streamed body-size cap, so an adversarial server cannot OOM the
//    function with a multi-hundred-megabyte response.
//    (A hostile DNS server could still answer differently between our lookup and
//    the connection; acceptable for these admin-only routes.)

import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const DEFAULT_FETCH_TIMEOUT_MS = 30_000
const MAX_REDIRECTS = 5
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024  // 5 MB
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (compatible; HiveCraic/1.0; +https://hivecraic.com)'

function ipv4ToNumber(ip: string): number {
  return ip.split('.').reduce((acc, part) => acc * 256 + Number(part), 0)
}

function inIpv4Range(ip: string, base: string, bits: number): boolean {
  const size = 2 ** (32 - bits)
  return Math.floor(ipv4ToNumber(ip) / size) === Math.floor(ipv4ToNumber(base) / size)
}

// True for addresses an admin-supplied URL must never reach.
export function isPrivateAddress(address: string): boolean {
  const ip = address.replace(/^\[|\]$/g, '').toLowerCase()
  const version = isIP(ip)
  if (version === 4) {
    return [
      ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
      ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16],
      ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4],
    ].some(([base, bits]) => inIpv4Range(ip, base as string, bits as number))
  }
  if (version === 6) {
    if (ip === '::' || ip === '::1') return true
    // IPv4-mapped addresses, dotted ("::ffff:127.0.0.1") or as the URL parser writes them ("::ffff:7f00:1")
    const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isPrivateAddress(mapped[1])
    const mappedHex = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
    if (mappedHex) {
      const high = parseInt(mappedHex[1], 16)
      const low = parseInt(mappedHex[2], 16)
      return isPrivateAddress(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`)
    }
    return /^f[cd]/.test(ip)            // fc00::/7 unique local
      || /^fe[89ab]/.test(ip)            // fe80::/10 link-local
      || ip.startsWith('ff')             // multicast
  }
  return false
}

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
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    isPrivateAddress(hostname)
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
    // Follow redirects ourselves so every hop is checked like the first URL.
    let currentUrl = url
    let response: Response | null = null
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await assertFetchablePublicUrl(currentUrl)
      response = await fetch(currentUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': userAgent },
        redirect: 'manual',
      })
      const location = response.headers.get('location')
      if (response.status >= 300 && response.status < 400 && location) {
        await response.body?.cancel()
        currentUrl = new URL(location, currentUrl).toString()
        response = null
        continue
      }
      break
    }
    if (!response) {
      throw new Error('Too many redirects')
    }

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

// The URL must pass assertSafePublicUrl AND its hostname must resolve only to public addresses.
async function assertFetchablePublicUrl(rawUrl: string): Promise<void> {
  const check = assertSafePublicUrl(rawUrl)
  if (!check.ok) throw new Error(check.reason)
  const hostname = check.url.hostname.replace(/^\[|\]$/g, '')
  if (isIP(hostname)) return // literal already checked above
  let addresses: { address: string }[]
  try {
    addresses = await lookup(hostname, { all: true })
  } catch {
    throw new Error('Could not resolve the URL host')
  }
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('Internal/private URLs are not allowed')
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
