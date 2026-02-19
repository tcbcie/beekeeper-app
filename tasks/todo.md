# Fix: News Articles POST 500 Error

## Root Cause
The POST `/api/admin/news-articles` endpoint fails with a 500 when adding a new article URL. The Supabase logs show:
1. Auth verification succeeds (200)
2. Duplicate check returns 406 (`.single()` with no matching row — expected for new articles)
3. **No subsequent database operations** — the code crashes before reaching the insert

The failure occurs in `extractUrlMetadata()` — the server-side `fetch()` to the target URL (science.org) is likely blocked by the site (403/paywall/anti-bot). The error is swallowed by a generic `catch` block that returns `"Failed to add article"` with no detail.

## Fix Plan

- [x] **1. Use `.maybeSingle()` instead of `.single()` for duplicate check** — avoids the spurious 406 error from PostgREST when no row is found
- [x] **2. Return the actual error message in the POST catch block** — so the user/dev can see WHY it failed (e.g. "Failed to fetch URL: 403") instead of a generic message
- [x] **3. Add specific error handling for URL fetch failures** — catch fetch errors separately and return a clear 422 response (e.g. "Could not fetch URL: site returned 403") instead of a generic 500

All changes are in a single file: `src/app/api/admin/news-articles/route.ts`

## Review

### Summary of Changes

| # | Change | Detail |
|---|--------|--------|
| 1 | `.single()` → `.maybeSingle()` | Duplicate URL check no longer triggers a 406 from PostgREST when no row exists |
| 2 | Error detail in catch block | Outer catch now returns the actual error message (e.g. `"Failed to add article: Failed to fetch URL: 403"`) instead of a generic string |
| 3 | URL fetch try-catch | `extractUrlMetadata()` is wrapped in its own try-catch; fetch failures return a **422** with a clear message (e.g. `"Could not fetch URL: Failed to fetch URL: 403"`) |

### What This Fixes
- The user will now see a **specific error message** when adding an article fails (e.g. the target site blocked the request)
- The duplicate check no longer produces spurious 406 errors in Supabase logs
- URL fetch failures are distinguished from other errors (422 vs 500)

### What This Doesn't Fix
- If science.org (or any site) blocks server-side requests, the article still can't be auto-fetched — but now the error message makes this clear so the user understands why

### Testing
- Deploy and retry adding the science.org article — the error message should now say exactly what went wrong (e.g. "Could not fetch URL: Failed to fetch URL: 403")
