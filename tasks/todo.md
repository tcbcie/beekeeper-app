# Fix: False "Account Deactivated" Message on Account Switch

**Date:** 04/04/2026
**Status:** In Progress

## Problem
When switching between accounts on mobile, users see "Your account has been deactivated" — even though the account is fine. This happens because `isAccountActive()` returns `false` for ANY failure (session error, network issue, RLS conflict), and the dashboard layout treats all `false` results as "deactivated."

## Root Cause
`src/lib/auth.ts` → `isAccountActive()` conflates three states into a single `false`:
1. Account genuinely deactivated (`is_active === false` or `deleted_at` is set)
2. Profile query failed (network, RLS, expired token)
3. No user session

The dashboard layout (`src/app/dashboard/layout.tsx`) then shows the "deactivated" message for all three cases.

## Plan

- [x] 1. Add `getAccountStatus()` function to `src/lib/auth.ts` that returns `'active' | 'deactivated' | 'error' | 'no_session'`
- [x] 2. Update `dashboard/layout.tsx` initial check to use `getAccountStatus()` and show different messages:
  - `deactivated` → Keep existing message about deactivation
  - `error` / `no_session` → "You have been locked out. Please log on again."
- [x] 3. Update the periodic check (30-second interval) in dashboard layout with the same logic
- [ ] 4. Prompt user to test on mobile with account switching

## Files to Change
- `src/lib/auth.ts` — Add `getAccountStatus()` function
- `src/app/dashboard/layout.tsx` — Use new function with appropriate messages
