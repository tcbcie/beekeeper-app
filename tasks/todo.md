# Task: Batch Completion Status + List Filters

**Date:** 29/03/2026
**Status:** Complete

## Objective
1. Automatically mark a batch as "Completed" when all grafts are terminal
2. Add status and year filters to the batch list

## Plan

- [x] 1. Add `status` to Batch interface in `batches/page.tsx`
- [x] 2. Add auto-completion check in `useBatchGrafts` count sync
- [x] 3. Show "Completed" badge in batch list views
- [x] 4. Add status filter (All/Active/Completed) and year filter to batch list
- [x] 5. Update feature documentation

## Review

### Changes Made

- **`src/app/dashboard/batches/page.tsx`**
  - Added `status: string | null` to Batch interface
  - Added `useMemo` import
  - Added `filterStatus` (default: `'active'`) and `filterYear` (default: `'all'`) state
  - Added `availableYears` memo: extracts unique years from graft dates
  - Added `filteredBatches` memo: applies status + year filters
  - Added filter bar with two dropdowns + count label above the batch list
  - Both mobile card and desktop table views use `filteredBatches`
  - Empty state messages differentiate "no batches" vs "no matches"
  - Green "Completed" badge next to batch name in both views

- **`src/hooks/useBatchGrafts.ts`**
  - In count sync effect: checks if all grafts are `sold` or `failed`
  - Sets batch `status` to `'completed'` or `'active'` alongside existing count persist

### Notes
- No DB migration needed
- Default filter is "Active" so completed batches are hidden until user selects them
- Auto-reverts to "active" if a distribution is deleted
