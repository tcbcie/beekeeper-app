# P1 Error Handling & State Management Fixes

## Todo

- [x] Fix 1: ERR-6 — File validation in useImageUpload (size + type check)
- [x] Fix 2: ERR-7 — Gate hive fetch on `filtersLoaded` flag
- [x] Fix 3: ERR-8 + STATE-6 — Dashboard polling try-catch + concurrent guard
- [x] Fix 4: ERR-9 — Local timezone date helper in useDashboardStats
- [x] Fix 5: STATE-4 — AuthContext refreshUser concurrent guard

## Skipped (Already Fixed)
- ERR-10: trace page already has regex validation
- STATE-5: useRecordsData already has fetchInProgressRef guard

## Review

### Changes Summary

**Fix 1 — `src/hooks/useImageUpload.ts`**
- Added file type validation against `MIME_MAP` keys (jpg, jpeg, png, gif, webp) at the start of `uploadImage`
- Added file size validation: rejects 0-byte files and files over 10MB
- Returns `null` with a descriptive error message via `onError` callback on validation failure

**Fix 2 — `src/app/dashboard/hives/page.tsx`**
- Added `filtersLoaded` to the guard condition on the hive refetch `useEffect`
- Changed `if (userId)` to `if (userId && filtersLoaded)` — prevents fetching before sessionStorage filters are restored
- Added `filtersLoaded` to the dependency array

**Fix 3 — `src/app/dashboard/layout.tsx`**
- Added `checkingAccountRef` useRef to prevent overlapping `isAccountActive()` calls in the 30s interval
- Wrapped the interval callback body in try-catch-finally with the ref guard
- Errors are logged to console instead of crashing silently

**Fix 4 — `src/hooks/useDashboardStats.ts`**
- Added `toLocalDateString()` helper using `date.toLocaleDateString('en-CA')` (returns YYYY-MM-DD in local timezone)
- Replaced all 4 instances of `.toISOString().split('T')[0]` with the new helper
- Fixes date being off by a day for users near midnight in non-UTC timezones

**Fix 5 — `src/contexts/AuthContext.tsx`**
- Added `useRef` to imports
- Added `refreshingRef` useRef as a concurrent call guard
- `refreshUser` returns early if already in progress; ref is reset in the `finally` block
