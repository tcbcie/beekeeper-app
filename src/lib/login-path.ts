import { safeRedirectPath } from './safe-redirect'

/**
 * The login page link for a signed-out visitor, remembering the page they wanted (for example
 * a hive QR code) so they return to it after signing in. Only in-app targets allowed by
 * safeRedirectPath are kept. Browser only (it reads the current address); not for sign-out or
 * deactivation, which go to a plain /login.
 */
export function loginPath(): string {
  if (typeof window === 'undefined') return '/login'
  const target = safeRedirectPath(window.location.pathname + window.location.search)
  return target && target !== '/dashboard' ? `/login?redirect=${encodeURIComponent(target)}` : '/login'
}
