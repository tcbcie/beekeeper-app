# Move Rearing Reports to Main Reports Page

## Tasks

- [x] 1. Add rearing report tabs to Reports page (`src/app/dashboard/reports/page.tsx`)
  - Import `RearingGroupReport`, `NIHBSMonthlyReturn`, `useRearingGroups`, and `Crown` icon
  - Expand `ReportSection` type with `'rearing-report'` and `'nihbs-returns'`
  - Call `fetchRearingGroups(userId)` in the existing user init `useEffect`
  - Conditionally add tabs to `sections` array when `ownedRearingGroups.length > 0`
  - Add URL param validation for the new section values
  - Render the two components when their tab is active

- [x] 2. Remove report sections from rearing-team page (`src/app/dashboard/rearing-team/page.tsx`)
  - Remove the `RearingGroupReport` and `NIHBSMonthlyReturn` rendering blocks (lines ~840-848)
  - Remove their imports (lines 9-10)

- [x] 3. Update docs (`docs/features/nihbs-monthly-returns.md`)
  - Update location reference from rearing-team to reports page

## Code Audit

### HIGH — Orphaned tab state via URL deep-link (Fixed)
- Non-owner navigating to `?section=rearing-report` would see blank content panel with no tab highlighted
- Fixed with `effectiveSection` derived value that falls back to `'dafm-varroa'` when rearing tabs are unavailable

### MEDIUM — Vestigial border-t styling (Fixed)
- Both `RearingGroupReport` and `NIHBSMonthlyReturn` had `mt-6 pt-6 border-t` from when they sat below group management UI
- Removed — they now render standalone inside the report content card which provides its own padding

## Review

### Summary
Moved the Monthly Rearing Report and NIHBS Monthly Returns from the Rearing Team page to the main Reports page as conditional tabs. Tabs only appear for users who own a rearing group. Hardened with `effectiveSection` fallback for edge cases.

### Changes Made

| File | Change |
|------|--------|
| `src/app/dashboard/reports/page.tsx` | Added imports, `useRearingGroups` hook, two conditional tabs, `effectiveSection` fallback, URL param validation, and component rendering |
| `src/app/dashboard/rearing-team/page.tsx` | Removed `RearingGroupReport` and `NIHBSMonthlyReturn` imports and rendering blocks |
| `src/components/rearing-groups/RearingGroupReport.tsx` | Removed vestigial `mt-6 pt-6 border-t border-border` wrapper styling |
| `src/components/rearing-groups/NIHBSMonthlyReturn.tsx` | Removed vestigial `mt-6 pt-6 border-t border-border` wrapper styling |
| `docs/features/nihbs-monthly-returns.md` | Updated location reference to Reports page |

### Notes
- No data logic changes — components receive the same props as before
- Tabs are conditionally rendered using spread operator on the sections array
- Non-owners see no change to their Reports page
- `effectiveSection` prevents blank content panel from orphaned URL params or async race conditions
