# Auth: Stop spurious logouts on flaky connections

## Problem

Users — primarily on mobile with unstable internet — reported being logged out
frequently and having to sign in again. The Supabase client was configured
correctly (`@supabase/ssr`, `persistSession`, `autoRefreshToken`, PKCE); the
logouts came from our own code treating a *transient network failure* as an
*authoritative "you are signed out / deactivated"* signal.

### Root causes

1. **Periodic account check (dominant cause).** `dashboard/layout.tsx` runs
   `getAccountStatus()` every 30 seconds. That function returned `'error'`
   whenever the `profiles` query failed — including when the request never
   reached the server (mobile dead-spot). The layout then signed the user out
   on any non-`'active'` status. One failed background request = instant logout.
2. **`onAuthStateChange` ignored the event type.** `AuthContext` cleared the
   user on any null session, with no allowance for being offline.
3. **No grace period** before the `!user` redirect in the dashboard layout.

## Fix

The guiding principle: **only log a user out for a server-confirmed reason**
(explicit sign-out, server-confirmed deactivation, or a known-expired token).
"Couldn't reach the server" is transient — keep the session and retry.

### Changes

- **`src/lib/auth.ts`**
  - Added `'unreachable'` to the `AccountStatus` type, distinct from `'error'`.
    `'unreachable'` = we never reached the server (offline / network failure);
    `'error'` = the server *was* reached but returned a problem.
  - `getAccountStatus()` now returns `'unreachable'` when `navigator.onLine` is
    `false`, when the query throws at the fetch layer, or when the returned
    error looks like a network error (empty PostgREST `code` + fetch-style
    message). Genuine server errors still return `'error'` (fail-closed).
  - Added an `isNetworkError()` helper to distinguish the two.

- **`src/app/dashboard/layout.tsx`**
  - Both the initial and the 30-second periodic account checks now treat
    `'unreachable'` as transient: keep the user signed in and re-check on the
    next tick instead of signing out.
  - Added a 1.5-second grace timer before redirecting a momentarily-null user
    to `/login`. If the session recovers, the effect cleanup cancels the timer.

- **`src/contexts/AuthContext.tsx`**
  - `onAuthStateChange` no longer clears the user on a null session while
    offline, *unless* the event is an explicit `SIGNED_OUT` (which remains
    authoritative).
  - Added an `online` event listener that calls `refreshUser()` so a session
    kept through an offline blip is re-validated (or properly cleared) the
    moment connectivity returns.

## Security note

Deactivation enforcement is preserved. Whenever the server is genuinely
reachable, a deactivated/locked/soft-deleted account still triggers an
immediate sign-out exactly as before. We only relaxed the case where there is
**no authoritative answer at all** because the device is offline — an
unreachable server is not evidence that an account was deactivated.

## Manual testing checklist

- [ ] Sign in on a desktop browser; throttle the network to "Offline" in
      DevTools and wait past 30 seconds — you should remain signed in.
- [ ] Toggle back "Online" — the session re-validates without a logout.
- [ ] On mobile with a flaky connection, navigate between dashboard pages —
      no spurious logout.
- [ ] Deactivate a test account server-side while it is online — it should be
      signed out within ~30 seconds (deactivation still enforced).
- [ ] Genuine sign-out (sign-out button) still redirects to `/login` instantly.
