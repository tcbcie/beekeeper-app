// Where the app may send someone after signing in. Used by the login page (`?redirect=`) and
// the sign-in callback (`?next=`), so both check targets the same way. No 'use client': the
// callback route imports it on the server.

const PLACEHOLDER_ORIGIN = 'https://hivecraic.invalid'

// Pages that need a signed-in user and are worth returning to. The decline pages work signed
// out, and /login or /reset-password must never be a target.
const ALLOWED_PREFIXES = ['/dashboard', '/accept-invitation', '/accept-rearing-group-invitation']

/**
 * The path, query and hash of an in-app target, or null if it isn't one we allow. Other sites
 * are refused, including disguised ones: '//evil.com', '/\\evil.com', and characters the
 * browser strips ('/%09/evil.com'), which is why the value is parsed as the browser would
 * rather than character-checked.
 */
export function safeRedirectPath(value: string | null | undefined): string | null {
  if (!value || value.length > 2048) return null
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null
  let url: URL
  try {
    url = new URL(value, PLACEHOLDER_ORIGIN)
  } catch {
    return null
  }
  if (url.origin !== PLACEHOLDER_ORIGIN) return null
  const path = url.pathname // normalised: '/dashboard/../login' becomes '/login'
  if (!ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return null
  return `${path}${url.search}${url.hash}`
}
