# Dashboard Field UX Improvements — Task List

**Date:** 2026-03-13
**Feature Doc:** `docs/features/dashboard-field-ux-improvements.md`

## Tasks

- [x] **1. Glove Test — Simplify Bottom Nav to 5 tabs**
  - Added `bottomNav` flag to NavItem interface and 4 key items in `navigation.ts`
  - Rewrote `BottomNavBar.tsx` — 5 equal-width tabs (Overview, Apiaries, Records, Tasks, More)
  - Removed scroll/fade machinery (no longer needed with only 5 items)

- [x] **2. Push Quick Actions Above the Fold**
  - Moved Quick Actions panel above Apiary Weather in `dashboard/page.tsx`
  - Stats Strip separated into its own panel below apiaries

- [x] **3. Collapse Weather Forecast by Default**
  - Added `forecastExpanded` state (default: false) to `ApiaryWeatherRow.tsx`
  - Weather label row now a toggle button with "7-day"/"Hide" + chevron
  - Card header + hive stats + scale data always visible; forecast on demand

- [x] **4. GPS-Based Apiary Sorting**
  - Created `useGeolocation` hook (`src/hooks/useGeolocation.ts`) with haversine distance
  - Dashboard sorts apiaries nearest-first via `sortedApiaries` memo
  - Graceful fallback — original order if GPS denied/unavailable

- [x] **5. Sun Glare Contrast Improvements**
  - All Recent Activity badges: `bg-*-100` → `bg-*-200`, text → `*-900`, added `font-semibold`
  - Date text: added `font-medium`, apiary name promoted from `text-tertiary` to `text-secondary`
  - Weather card: "Hives"/"Last Inspected" labels → `font-medium text-text-secondary`
  - Scale WeightChip labels → `font-medium text-text-secondary`
  - Forecast day labels → `font-semibold text-text-secondary`, min temps → `font-medium text-text-secondary`

## Code Audit (Post-Implementation)

- [x] **CRITICAL: `<button>` inside `<Link>` — invalid HTML**
  - Replaced `<button>` with `<div role="button">` + keyboard handler + `e.stopPropagation()`
  - Added `aria-expanded` and `aria-label` for screen readers

- [x] **HIGH: `useGeolocation` state update after unmount**
  - Added `mountedRef` guard so `setPosition` only fires if component is still mounted
  - Proper cleanup in effect return

- [x] **HIGH: `haversineKm` — no NaN/Infinity guard**
  - Added `Number.isFinite()` guard on all 4 params, returns `Infinity` on invalid input
  - Prevents sort corruption from corrupt database coordinates

- [x] **MEDIUM: Sort comparator recomputes haversine O(n log n) times**
  - Refactored to pre-compute distances once (O(n)), then sort by lookup

- [x] **MEDIUM: BottomNavBar false-active on prefix collision**
  - Changed `startsWith(href)` → `=== href || startsWith(href + '/')`

- [x] **LOW: Skeleton loading state didn't match new section order**
  - Reordered skeleton to: Quick Actions → Apiaries → Stats Strip → Recent Activity

## Review

### Files Changed
| File | Change |
|------|--------|
| `src/lib/navigation.ts` | Added `bottomNav` flag to NavItem + 4 items |
| `src/components/BottomNavBar.tsx` | Simplified to 5 equal-width tabs, fixed active-state matching |
| `src/app/dashboard/page.tsx` | Reordered sections, GPS sorting (optimised), contrast, skeleton fix |
| `src/components/dashboard/ApiaryWeatherRow.tsx` | Collapsible forecast (a11y-safe), contrast improvements |
| `src/hooks/useGeolocation.ts` | New hook — GPS + haversine with unmount guard + NaN safety |

### Summary
- **No functionality removed** — all nav items still accessible via More drawer
- **Zero database changes** — purely frontend
- **TypeScript compiles clean** — all pre-existing test errors, none in changed files
- **Dark mode preserved** — all contrast changes include dark mode variants
- **Graceful degradation** — GPS hook silently falls back if denied/unavailable
- **Audit passed** — 4 defects found and fixed (1 Critical, 2 High, 1 Medium), 2 low-severity items resolved
