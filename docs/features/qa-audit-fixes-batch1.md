# QA Audit Fixes - Batch 1 (Top 10 Priority)

**Date:** 16 February 2026
**Scope:** Top 10 highest-priority issues from the comprehensive QA audit

---

## Issues Addressed

### SEC-8: Open Redirect in Login Page
**File:** `src/app/login/page.tsx`
**Fix:** Validated the `redirect` URL parameter and `pendingRedirect` localStorage value to only allow internal paths starting with `/` (rejecting protocol-relative `//` URLs). Prevents attackers from redirecting users to malicious sites after login.

### SEC-2: Admin Impersonation Audit Logging
**File:** `src/app/api/admin/impersonate/route.ts`
**Fix:** Added structured `console.warn` audit log entries for every impersonation attempt - auth failures, role check failures, and successful impersonations. Each log includes admin ID, target user ID, status, and timestamp.

### QUAL-1 + SEC-9: AuthContext Loading State & Offline Fallback
**File:** `src/contexts/AuthContext.tsx`
**Fix:** Extracted duplicated offline session restoration code into a `tryOfflineFallback()` helper function. Removed redundant `setLoading(false)` calls from early returns, ensuring the `finally` block is the sole owner of loading state transitions.

### ERR-1: Error Handling in useApiaryDetail
**File:** `src/hooks/useApiaryDetail.ts`
**Fix:** Added error destructuring and throw on the hives query. Added `console.error` logging for each sub-query failure in the Promise.all (inspections, treatments, varroa checks, feedings, harvests). Data fallbacks (`|| []`) were already in place.

### PERF-2: Deduplicate getAccessibleHiveIds
**File:** `src/hooks/useRecordsData.ts`
**Fix:** `fetchAllData` now calls `getAccessibleHiveIds` once and passes the result to all 5 record fetch functions via an optional `preloadedHiveIds` parameter. This eliminates 8 redundant Supabase queries per records page load (from 10 down to 2). Individual fetch functions remain backward-compatible when called independently.

### STATE-1: UpdateManager Memory Leak Cleanup
**File:** `src/lib/update-manager.ts`
**Fix:** Added `initialized` guard to prevent double-initialisation. Stored references to the `setInterval`, `visibilitychange` handler, and `controllerchange` handler. Added a `destroy()` method that clears the interval, removes event listeners, and clears all subscribers.

### ERR-2: Numeric Parsing in News Search API
**File:** `src/app/api/news/search/route.ts`
**Fix:** Added NaN check and bounds clamping (min 1, max 50) for the `limit` query parameter. Invalid values like `abc` or `-5` now fall back to 10.

### PERF-7/8: Dashboard useMemo Optimisation
**File:** `src/app/dashboard/page.tsx`
**Fix:** Wrapped `statCards`, `isTeamMember`, `hasMySharedData`, `hasSharedWithMeData`, `mySharedCards`, and `sharedWithMeCards` in `useMemo` with appropriate dependency arrays to prevent unnecessary recalculations on every render.

---

## Testing Checklist

- [ ] Run `npm run build` - no TypeScript/compilation errors
- [ ] Login with `?redirect=/dashboard/hives` - should redirect to hives page after login
- [ ] Login with `?redirect=https://evil.com` - should redirect to `/dashboard` (not the external URL)
- [ ] Dashboard loads correctly with team data and stat cards
- [ ] Records page loads without regressions
- [ ] Offline behaviour: cached session still shows, loading spinner resolves
- [ ] Admin impersonation: check server logs for `[AUDIT]` entries
