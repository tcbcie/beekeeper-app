# Batch 29: Sign-in Redirects and Offline Sign-in

**Status:** Implemented 23/10/2026, waiting for the owner's test.
**Checklist:** `tasks/security-batch29-todo.html`
**Findings:** C1-01, C1-02 and C1-03 (the cause of C1-03 is corrected below). This is Phase 2 fix batch 16. There is no server middleware, so every redirect happens in the pages.

## A. Invitation round trip (C1-01, C1-02)

**Before:**

- **Wrong target format:** the invitation pages sent `?redirect=<full URL>`. The login page only accepts paths starting with `/`, so it fell back to `/dashboard`.
- **Stored value never used:** `localStorage.pendingRedirect` was written for sign-up confirmation and Google sign-in, but only read for `/dashboard…` values. It was never used, and lingered.
- **Callback ignored the target:** `/auth/callback` always went to `/dashboard`.
- **Already signed in:** a signed-in visitor with `?redirect=` stayed on the login page.

**Now:**

- **`src/lib/safe-redirect.ts`, `safeRedirectPath(value)`:**
  - Returns path, query and hash only for in-app targets under `/dashboard`, `/accept-invitation` or `/accept-rearing-group-invitation`; otherwise it returns null.
  - It parses the value against a placeholder origin, so `//evil.com`, `/\evil.com`, `/%09/evil.com` and tab tricks are refused, and `..` is normalised.
  - The decline pages (no sign-in needed), `/login` and `/reset-password` are not targets.
  - It has no `'use client'`; the callback route uses it too.
  - Checked against 16 cases.
- **Invitation pages:** they send `pathname + search`.
- **Login page:**
  - Uses the helper.
  - Removes the old `pendingRedirect`.
  - Sends a signed-in visitor straight to the target.
  - Shows a message for `?error=auth_error`.
- **Through `/auth/callback?next=<target>`:** both sign-up's `emailRedirectTo` and Google's `redirectTo` now go through the callback.
- **`/auth/callback`:**
  - Checks `next` with the helper and redirects there after the code exchange.
  - On an exchange error it goes to `/login?error=auth_error&redirect=<target>`, so signing in there, for example after opening the confirmation link in another browser, still lands on the invitation.

**The four cases:**

- Existing user with password: login page, then the target.
- Existing user with Google, or new user with Google: Google, then the callback, then the target.
- New user with e-mail confirmation: `/auth/verify`, then Supabase verify, then the callback, then the target. This also works when the link opens on another device, where it now asks you to sign in.

**Supabase setting:** the production Site URL already allows its own host, so `https://www.hivecraic.com/auth/callback?next=…` should work as it is. Preview and localhost origins need their own entries under Auth → URL Configuration → Redirect URLs, if used.

**Not done:** keeping the target when a dashboard page bounces a signed-out visitor to the login page, for example a hive QR code. Each page's start-up calls `router.push('/login')` before the layout can, so this needs a shared "go to login" helper across about 40 pages. It's left for a later batch.

## B. Opening the app offline (C1-03, cause corrected)

The audit blamed the offline fallback that read `localStorage['supabase.auth.token']`. That code was dead: `@supabase/ssr` keeps the session in cookies, and the fallback also refused expired sessions, so it could never have helped. The real cause:

- **Expired token offline:** after the access token expires (one hour), `getSession()` offline retries the renewal for about 25 seconds. It then returns `session: null` with an `AuthRetryableFetchError`, without signing out.
- **Read as signed out:** AuthContext, `getCurrentUserId()` (43 callers) and the home page treated that as signed out. After 25–50 seconds, users were sent to `/login` even though the session cookie was still valid.

**Fix:**

- **`src/lib/last-user.ts`:**
  - `rememberLastUser` / `readLastUser` / `forgetLastUser` keep id and e-mail under `hivecraic_last_user`.
  - `isOfflineAuthError(error)`: `isAuthRetryableFetchError` or `navigator.onLine === false`.
- **AuthContext:**
  - The dead fallback is removed.
  - Every session remembers the user.
  - On an offline error it keeps the current or remembered user.
  - When the device is offline at start-up, it shows the remembered user straight away, with no 25-second spinner.
- **`getCurrentUserId()`:** returns the remembered id on an offline error.
- **Home page (`/`):** opens the dashboard on an offline error when a user is remembered.
- **`clearLocalUserData()`:** forgets the user. It already runs on `SIGNED_OUT`.

**Security:**

- The remembered id only chooses the screens. The expired token is never used, and reads and saves still need a valid session (they fail offline anyway).
- Back online, the `online` handler re-checks the session.
- A real sign-out, such as an invalid refresh token (not a retryable error) or an explicit sign-out, still signs the user out.

## Verification

- `tsc --noEmit`: 0 errors.
- `eslint` on the 10 changed files: clean.
- Tests: 818 passed, 23 skipped.
- `safeRedirectPath`: 16 of 16 cases.
- qa-engineer: no Critical or High issues.

## Rules

- Any post-sign-in target goes through `safeRedirectPath`. Targets travel in the URL (`?redirect=`, `?next=`), never in localStorage.
- OAuth and e-mail sign-in links go through `/auth/callback?next=…`.
- A sign-in check that fails with a network error is "can't check right now" (`isOfflineAuthError`), never "signed out".
