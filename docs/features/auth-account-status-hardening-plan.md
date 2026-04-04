# Auth & Account Status Hardening Plan

**Date:** 04/04/2026
**Auditor Role:** Principal Quality Architect
**Scope:** `src/lib/auth.ts`, `src/app/dashboard/layout.tsx`, `src/contexts/AuthContext.tsx`

## Audit Findings

### CRITICAL-1: Race Condition — Status Applied to Wrong User
**Files:** `layout.tsx:39-52`, `layout.tsx:80-91`
**Problem:** `getAccountStatus()` captures the userId at call time via `getCurrentUserId()`. If the user signs out or switches account during the async DB query, the returned status belongs to the old user but is applied to the current context. User B can be erroneously signed out because User A's query returned `'deactivated'`.
**Fix:** Capture `user.id` before the await, compare it to the current `user.id` after, and discard stale results.

### CRITICAL-2: Unhandled `signOut()` Failure
**Files:** `layout.tsx:43`, `layout.tsx:84`, `auth.ts:218`
**Problem:** `supabase.auth.signOut()` can reject (network error, storage access denied). In the layout, the rejection propagates into the effect and silently aborts — the toast and redirect never execute, leaving the user in a broken half-signed-out state.
**Fix:** Wrap `signOut()` in a try-catch; proceed with redirect regardless, since the purpose is to get the user to the login page.

### HIGH-1: Memory Leak — `accountActiveCache` Grows Unboundedly
**File:** `auth.ts:139`
**Problem:** The `Map` adds entries per userId but never removes them. Stale entries (past TTL) are ignored on read but remain in memory. In a shared browser (e.g., demo kiosk, multiple account switching), this leaks.
**Fix:** Evict expired entries on each write, or cap the Map to a reasonable maximum.

### HIGH-2: Initial Effect vs. Interval Race
**Files:** `layout.tsx:29-58`, `layout.tsx:73-103`
**Problem:** The initial `checkAccount` effect and the 30-second interval can fire `getAccountStatus()` concurrently. Both paths can call `signOut()` simultaneously if the account is inactive. The `hasShownDisabledAlert` ref prevents duplicate toasts but not duplicate sign-out calls.
**Fix:** Gate the interval behind `checkingAccount === false` so it only starts after the initial check succeeds.

### MEDIUM-1: `requireActiveAccount()` Uses Old Undiscriminated Path
**File:** `auth.ts:213-221`
**Problem:** `requireActiveAccount()` calls `isAccountActive()` — which now delegates to `getAccountStatus()` — but still shows a generic "disabled" error for both deactivation and transient errors. Also calls `signOut()` without error handling.
**Note:** This function is currently unused (dead code). Mark or remove.

## Plan

- [x] 1. **CRITICAL-1** — Add stale-user guard in `layout.tsx` for both initial check and interval
- [x] 2. **CRITICAL-2** — Wrap `signOut()` calls in try-catch in `layout.tsx`
- [x] 3. **HIGH-1** — Add cache eviction in `auth.ts` to prevent unbounded growth
- [x] 4. **HIGH-2** — Gate the interval behind initial check completion in `layout.tsx`
- [x] 5. **MEDIUM-1** — Remove dead `requireActiveAccount()` function
- [ ] 6. Prompt user to test

## Files Changed
- `src/lib/auth.ts`
- `src/app/dashboard/layout.tsx`

## Review

### Changes Made

1. **Stale-user cancellation** (`layout.tsx`) — Both the initial `checkAccount` effect and the 30-second interval now use a `cancelled` flag set in the cleanup function. If the `user` changes during an async `getAccountStatus()` call, the stale result is discarded instead of applied to the wrong user context.

2. **signOut() try-catch** (`layout.tsx:47, 94`) — Both sign-out calls are now wrapped in try-catch. If `signOut()` rejects (network error, storage denied), the toast and redirect still execute. The user always reaches the login page.

3. **Cache eviction** (`auth.ts:194-200`) — Before writing a new cache entry, all expired entries are pruned. A hard cap of 10 entries acts as a safety net for pathological cycling. Prevents the `Map` from growing unboundedly.

4. **Interval gated behind initial check** (`layout.tsx:81`) — The interval effect now depends on `checkingAccount` and exits early if `true`. This eliminates the race window where the initial check and interval could fire `getAccountStatus()` concurrently and trigger duplicate sign-outs.

5. **Dead code removal** (`auth.ts`) — `requireActiveAccount()` was unused by any source file. Removed to reduce surface area and eliminate its unhandled `signOut()` call.
