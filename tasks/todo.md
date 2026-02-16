# QA Audit - Top 10 Priority Fixes

## Todo Items

- [x] Fix 1: SEC-8 - Open redirect validation in login page
- [x] Fix 2: SEC-2 - Add audit logging to admin impersonation
- [x] Fix 3: QUAL-1 + SEC-9 - Fix AuthContext loading state & deduplicate offline fallback
- [x] Fix 4: ERR-1 - Add error handling to useApiaryDetail queries
- [x] Fix 5: PERF-2 - Deduplicate getAccessibleHiveIds in useRecordsData
- [x] Fix 6: STATE-1 - Add cleanup to UpdateManager (memory leak)
- [x] Fix 7: ERR-2 - Validate numeric parsing in news search API
- [x] Fix 8: PERF-7/8 - Add useMemo to dashboard computed values

## Review

### Summary of Changes

| Fix | File | What Changed |
|-----|------|-------------|
| SEC-8 | `src/app/login/page.tsx` | Validates `redirect` param and `pendingRedirect` localStorage to only allow paths starting with `/` (not `//`) |
| SEC-2 | `src/app/api/admin/impersonate/route.ts` | Added `console.warn` audit logs for auth failure, role check failure, and successful impersonation |
| QUAL-1 + SEC-9 | `src/contexts/AuthContext.tsx` | Extracted offline fallback into `tryOfflineFallback()` helper, removed duplicate `setLoading(false)` calls (now handled solely by `finally`) |
| ERR-1 | `src/hooks/useApiaryDetail.ts` | Added error check on hives query (throws on error), added `console.error` for each Promise.all sub-query failure |
| PERF-2 | `src/hooks/useRecordsData.ts` | `fetchAllData` calls `getAccessibleHiveIds` once and passes result to all 5 record fetch functions via optional `preloadedHiveIds` param. Eliminates 8 redundant Supabase queries per page load |
| STATE-1 | `src/lib/update-manager.ts` | Added `initialized` guard, stored interval/handler references, added `destroy()` method to clean up listeners and intervals |
| ERR-2 | `src/app/api/news/search/route.ts` | Added NaN check and bounds clamping (1-50) for `limit` parameter |
| PERF-7/8 | `src/app/dashboard/page.tsx` | Wrapped `statCards`, `isTeamMember`, `hasMySharedData`, `hasSharedWithMeData`, `mySharedCards`, `sharedWithMeCards` in `useMemo` |

### No Breaking Changes
- All fetch functions retain backward compatibility (new `preloadedHiveIds` param is optional)
- UpdateManager singleton still works the same; `destroy()` is additive
- Login redirect behaviour unchanged for valid internal paths

### Testing Recommendations
1. Run `npm run build` to verify no TypeScript/compilation errors
2. Test login with `?redirect=/dashboard/hives` (should work) and `?redirect=https://evil.com` (should redirect to `/dashboard`)
3. Test dashboard loads correctly with team data
4. Test records page loads (verify no regressions from hive ID deduplication)
5. Test offline behaviour in AuthContext
