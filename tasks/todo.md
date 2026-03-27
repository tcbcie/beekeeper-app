# Task: Foraging Hours Tab — Code Audit Hardening
**Date:** 27/03/2026
**Status:** Complete

## Findings

| # | Severity | Issue | Lines |
|---|----------|-------|-------|
| 1 | Critical | Race condition — no AbortController on fetch; stale responses can overwrite fresh data | 136-228 |
| 2 | High | Sequential API calls — 5 years = 5 serial HTTP requests | 149 |
| 3 | High | Supabase error silently swallowed — no user feedback on failure | 113 |
| 4 | Medium | `currentYear`/`availableYears` recreated every render | 83-84 |

## Plan

- [x] Add AbortController to `fetchForagingData`; abort previous in-flight fetches on re-trigger and on unmount
- [x] Convert sequential `for` loop to `Promise.allSettled` for parallel year fetching
- [x] Check Supabase `error` in apiary fetch; log and handle gracefully
- [x] Stabilise `currentYear` and `availableYears` with `useMemo`

## Files Affected
- `src/components/research/ForagingHoursTab.tsx`

## Review

All four issues resolved in a single pass:

1. **AbortController** — `fetchForagingData` now accepts an `AbortSignal`. The triggering `useEffect` creates a controller and aborts on cleanup (dependency change or unmount). State setters are guarded by `signal.aborted` checks. `AbortError` is caught and silently dropped.

2. **Parallel fetches** — The sequential `for` loop replaced with `Promise.allSettled(yearsToFetch.map(...))`. Each year's fetch+processing runs concurrently. Individual failures (`rejected` or `null` return) are skipped during result assembly — one year failing doesn't break the others.

3. **Supabase error** — Destructure now includes `error`; early return with `console.error` on failure instead of silently proceeding with `null` data.

4. **Stable references** — `currentYear` and `availableYears` wrapped in `useMemo` with appropriate dependency arrays. Prevents unnecessary callback/effect invalidation.
