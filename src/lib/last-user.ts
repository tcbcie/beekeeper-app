import { isAuthRetryableFetchError } from '@supabase/supabase-js'

// The last signed-in user on this device (id and e-mail only). When the app is opened offline
// after the hour-long sign-in token has expired, renewing it fails with a network error. That
// means "can't check right now", not "signed out", so the app keeps showing this user's screens
// instead of sending them to the login page (C1-03). It never grants access: reading or saving
// data still needs a valid session, and a real sign-out removes it (clearLocalUserData).

const LAST_USER_KEY = 'hivecraic_last_user'

export interface LastUser {
  id: string
  email: string | null
}

export function rememberLastUser(user: { id: string; email?: string | null }): void {
  try {
    localStorage.setItem(LAST_USER_KEY, JSON.stringify({ id: user.id, email: user.email ?? null }))
  } catch {
    // Storage unavailable (private mode, blocked site data): offline start just shows login.
  }
}

export function readLastUser(): LastUser | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(LAST_USER_KEY) ?? 'null')
    return parsed && typeof parsed.id === 'string' && parsed.id
      ? { id: parsed.id, email: typeof parsed.email === 'string' ? parsed.email : null }
      : null
  } catch {
    return null
  }
}

export function forgetLastUser(): void {
  try {
    localStorage.removeItem(LAST_USER_KEY)
  } catch {
    // Storage unavailable: nothing stored.
  }
}

/** True when a sign-in check failed only because the server couldn't be reached. */
export function isOfflineAuthError(error: unknown): boolean {
  return isAuthRetryableFetchError(error) || (typeof navigator !== 'undefined' && navigator.onLine === false)
}
