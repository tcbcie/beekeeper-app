# Dashboard Follow-up: Hamburger Fix + Apiary Task Count

**Date:** 2026-03-13

## Tasks

- [x] **1. Remove dead hamburger button from Navbar**
  - Removed `<IconButton>` hamburger, `Menu` import, and `onMenuClick` prop from Navbar
  - Updated layout.tsx to stop passing `onMenuClick`
  - Root cause: `.fj-icon-btn { display: inline-flex }` overrode Tailwind `hidden`

- [x] **2. Add `activeTaskCount` to apiary cards**
  - Added `activeTaskCount: number` to `DashboardApiary` type
  - Fetches active tasks per apiary in `useDashboardStats` (single query, counted in JS)
  - Renders teal task button in stats row (aligned right) when count > 0
  - Button shows icon + count + "task(s)" label
  - Click navigates to `/dashboard/tasks?apiary={id}` with stopPropagation (inside Link card)

- [x] **3. Add `?apiary=` query param to tasks page**
  - New useEffect reads `apiary` search param and sets `filterApiary`
  - Works alongside existing `?task=` and `?hive=` params

## Audit Findings (Round 2)

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 1 | HIGH | `window.location.href` in ApiaryWeatherRow bypasses Next.js router — full page reload, destroys React state, bad on slow field connections | Replaced with `useRouter` + `router.push()` |
| 2 | HIGH | `?apiary=` useEffect re-fires on every `searchParams` change, overriding user's manual filter | Added `appliedApiaryFilterRef` dedup guard — applies once per unique apiary ID |
| 3 | MEDIUM | Task count query ran sequentially after initial `Promise.all` — unnecessary extra round-trip | Moved into the existing `Promise.all` (now 7 parallel queries) |

## Review

### Files Changed
| File | Change |
|------|--------|
| `src/components/Navbar.tsx` | Removed hamburger button, Menu import, onMenuClick prop |
| `src/app/dashboard/layout.tsx` | Removed onMenuClick prop from Navbar |
| `src/types/dashboard.ts` | Added `activeTaskCount` to DashboardApiary |
| `src/hooks/useDashboardStats.ts` | Fetch active tasks per apiary; parallelised task count query |
| `src/components/dashboard/ApiaryWeatherRow.tsx` | Task count button in stats row; `router.push` instead of `window.location.href` |
| `src/app/dashboard/tasks/page.tsx` | Read `?apiary=` query param with dedup ref guard |
