# Frontend Design Review Implementation (P2-P10)

## Phase 1: CSS-Only Quick Wins

- [x] P7 — Glassmorphism on Navbar (frosted glass effect)
- [x] P7 — MobileDrawer backdrop blur
- [x] P6 — Standardise table headers (3 files)
- [x] P6 — MobileDrawer active state (forest colours)
- [x] P9 — Print polish (page counter CSS)

## Phase 2: New UI Components

- [x] P3 — Skeleton loading component
- [x] P3 — Use skeleton on dashboard loading state
- [x] P4 — EmptyState component
- [x] P4 — Apply EmptyState to apiaries, hives, queens, records pages

## Phase 3: ConfirmDialog + Alert Replacement

- [x] P2 — ConfirmDialog component + provider + hook
- [x] P2 — Add ConfirmProvider to layout
- [x] P2 — Replace confirm() in TerminologyTable + FrameStandardsManager
- [x] P2 — Replace confirm() in useHiveDetail
- [x] P10 — Replace alert() calls with toast (VarroaTreatmentForm, FinancialRecordForm, PurchaseItemForm)
- [x] P10 — Replace alert() in TerminologyTable + FrameStandardsManager
- [x] P10 — Replace alert() in dashboard layout, MapLocationPicker, NotificationStatusCard, subscription-history

## Phase 4: Chart Styling

- [x] P8 — CSS variable colours for ScaleHistoryChart
- [x] P8 — CSS variable colours for WolfHistoryChart

## Final

- [x] Create feature documentation
- [x] Review summary

---

## Review Summary

All 4 phases of the frontend design review implementation are complete:

**Phase 1 (CSS Quick Wins):** Glassmorphism on navbar, backdrop blur on mobile drawer, standardised table headers across 3 files, forest-green active state on mobile drawer, and print page counter CSS.

**Phase 2 (New Components):** Created `Skeleton.tsx` (3 variants) and `EmptyState.tsx`. Applied skeleton loading to dashboard and empty states to 4 key pages.

**Phase 3 (ConfirmDialog + Alerts):** Created context-based `ConfirmDialog` system with `useConfirm()` hook. Replaced `confirm()` in 3 files and `alert()` in 11 files with toast notifications.

**Phase 4 (Chart Styling):** Both `ScaleHistoryChart` and `WolfHistoryChart` now read `--viz-warning` and `--viz-info` CSS variables instead of hardcoded RGB values. Added `font: { family: 'inherit' }` for DM Sans inheritance.

**Total:** 3 new files, 24 modified files. See `docs/feature/frontend-design-review-implementation.md` for full details.

**Note:** Many files across the codebase still use native `confirm()` — these were outside the scope of this plan but can be migrated to `useConfirm()` incrementally.
