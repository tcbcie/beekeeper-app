# P3 QA Audit Fixes

## Fixes

- [x] Fix 1: SEC-16 — Add security headers to `next.config.ts`
- [x] Fix 2: SEC-17 — Sanitise error responses in 4 API routes
- [x] Fix 3: SEC-19 — Add npm audit script to `package.json`
- [x] Fix 4: STATE-10 — Add mountedRef to `useApiaryDetail.ts`
- [x] Fix 5: STATE-12 — Track setTimeout in `update-manager.ts`
- [x] Fix 6: PERF-18 — Add global error boundary `global-error.tsx`

## Review

### Summary of Changes

**SEC-16 — Security headers** (`next.config.ts`)
- Added `async headers()` returning X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and Strict-Transport-Security for all routes.

**SEC-17 — Sanitise error responses** (4 API routes)
- `stripe/checkout/route.ts`: Removed `details`, `message`, and stack trace leaks from error responses (3 edits).
- `admin/news-articles/route.ts`: Replaced all 6 `error.message` leaks with generic messages per operation (fetch/save/add/update/delete).
- `admin/impersonate/route.ts`: Removed `details` field from catch block response.
- `chat/route.ts`: Removed `details` field from catch block response.
- All `console.error()` calls retained for server-side logging.

**SEC-19 — npm audit script** (`package.json`)
- Added `"audit": "npm audit"` to scripts section.

**STATE-10 — mountedRef guard** (`useApiaryDetail.ts`)
- Added `mountedRef` + cleanup `useEffect` (same pattern as `useDashboardStats`).
- Added 3 guard checks after each async await point before setState calls.

**STATE-12 — Track setTimeout** (`update-manager.ts`)
- Added `noUpdateTimeout` class property to store the setTimeout return value.
- Stored timeout reference when scheduling the no-update fallback.
- Added `clearTimeout` in `destroy()` method.

**PERF-18 — Global error boundary** (`global-error.tsx`)
- Created Next.js `global-error.tsx` with simple retry UI.
- Uses amber button matching app brand colours.
- Covers all routes outside the dashboard error boundary.

### Files Modified
1. `next.config.ts` — SEC-16
2. `src/app/api/stripe/checkout/route.ts` — SEC-17
3. `src/app/api/admin/news-articles/route.ts` — SEC-17
4. `src/app/api/admin/impersonate/route.ts` — SEC-17
5. `src/app/api/chat/route.ts` — SEC-17
6. `package.json` — SEC-19
7. `src/hooks/useApiaryDetail.ts` — STATE-10
8. `src/lib/update-manager.ts` — STATE-12
9. `src/app/global-error.tsx` (new) — PERF-18

### Verification
Please run `npm run build` and confirm no TypeScript/compilation errors. Then check:
- Response headers in browser DevTools (Network tab) for X-Content-Type-Options, X-Frame-Options, etc.
- Dashboard and apiary detail pages load without console warnings about unmounted state updates.
