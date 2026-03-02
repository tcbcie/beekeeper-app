# NIHBS Report: Exclude Distributed Sealed Cells from Hatched/Mated Metrics

## Problem

When sealed queen cells are distributed from a batch, the batch counters (`queens_hatched`, `queens_mated`) still include those cells in the NIHBS report. These distributed sealed cells have no tracking of hatching or mating, so they should not appear under "queen cells hatched" (row 13) or "queens mated within group" (row 19).

**Current data example:** Batch has `queens_hatched=4`, `queens_mated=4`, but all 4 are distributed as sealed cells on 02/03/2026 (before emergence date 05/03/2026). The report incorrectly shows 4 hatched and 4 mated.

Additionally, queen_cell distributions are currently counted in rows 24/26 ("virgins distributed outside group") auto-calculation, which is also incorrect — they are sealed cells, not virgin queens.

## Plan

### 1. `useNIHBSReport.ts` — Data aggregation changes
- [x] Count queen_cell distributions per batch (from the already-fetched `graft_distributions` data)
- [x] Subtract queen_cell distribution count from `queens_hatched` and `queens_mated` per batch (floor at 0) before adding to monthly buckets
- [x] Add new field `queen_cells_distributed` to `MonthlyApiaryData` and `MonthlyData` to track distributed sealed cells per month (bucketed by batch emergence month, same as hatched/mated)
- [x] Remove `queen_cell` from the rows 24/26 auto-calculation filter (only count `virgin_queen` for external distributions)

### 2. `NIHBSMonthlyReturn.tsx` — UI changes
- [x] Add row 28 "Sealed queen cells distributed" in the desktop table (auto-calculated, read-only)
- [x] Add row 28 in the mobile card view
- [x] Add row 28 in the Excel export (after row 26, with blank row 27)

### 3. Documentation
- [x] Update `docs/features/nihbs-monthly-returns.md` to document row 28 and the exclusion logic
- [x] Update `docs/features/batch-distributions.md` NIHBS integration section

## Review

### Changes Made

| File | Change |
|------|--------|
| `src/hooks/useNIHBSReport.ts` | Added `queen_cells_distributed` to `MonthlyApiaryData` and `MonthlyData` interfaces. Added `batch_id` to distributions query. Count queen_cell distributions per batch, subtract from `queens_hatched`/`queens_mated` (floored at 0), track in new `queen_cells_distributed` field. Removed `queen_cell` from rows 24/26 auto-calculation filter. |
| `src/components/rearing-groups/NIHBSMonthlyReturn.tsx` | Added row 28 "Sealed queen cells distributed" in desktop table (blue highlight, read-only), mobile card view, and Excel export (with per-apiary breakdown). |
| `docs/features/nihbs-monthly-returns.md` | Documented row 28, exclusion logic, and updated external distribution filter description. |
| `docs/features/batch-distributions.md` | Updated NIHBS integration section to reflect queen_cell exclusion from rows 24/26 and separate tracking on row 28. |

### Impact
- 2 source files changed, 2 docs updated
- No database changes needed — uses existing `graft_distributions` data
- No breaking changes — new field defaults to 0, existing data unaffected
- Queen cell distributions now correctly excluded from hatched/mated metrics
