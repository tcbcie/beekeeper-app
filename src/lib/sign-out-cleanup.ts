import { forgetLastUser } from './last-user'
import { IMPERSONATION_KEY } from './impersonation-key'
import { clearScreenCache } from './screen-cache'

export { IMPERSONATION_KEY }

/**
 * Remove per-user data this device keeps outside the Supabase session, so the next
 * person to use it can neither see nor reuse it:
 * - the admin's stored session from an impersonation (its refresh token is live);
 * - the service worker's runtime cache (weather and geocoding lookups carrying apiary
 *   locations, and any API responses cached by older worker versions);
 * - the last data each screen showed. Inspection drafts are deliberately not here: this also runs
 *   when a session expires, which must not cost anyone their work.
 *
 * Safe to call more than once. Never throws.
 */
export function clearLocalUserData(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(IMPERSONATION_KEY)
  } catch {
    // Storage unavailable (private mode, blocked site data): nothing to clear.
  }
  // The last signed-in user kept for offline starts
  forgetLastUser()
  clearScreenCache()
  // Message the registration's active worker rather than `controller`, which is null
  // when this page isn't controlled (first load, hard refresh) even though the worker
  // and its cache exist. Older workers ignore the unknown message type.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration()
      .then((registration) => registration?.active?.postMessage({ type: 'CLEAR_USER_DATA' }))
      .catch(() => { /* no worker registered: nothing cached to clear */ })
  }
}
