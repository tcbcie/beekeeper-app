# Task: NIHBS Report — Fallback to Graft-Derived Counters When Batch Counters Are NULL
**Date:** 04/03/2026
**Status:** Completed

## 1. Objective
The NIHBS report shows 0 for grafts_accepted/queens_hatched/queens_mated when batch-level counters are NULL in the database. The Batch Quantities UI correctly derives these from individual graft statuses, but the NIHBS report only reads the batch record. Fix the NIHBS report to fall back to graft-derived counts when batch counters are NULL.

## 2. Root Cause
- `useBatchGrafts` hook auto-calculates counters from graft statuses and populates the batch edit form
- These calculated values only exist in form state — they are NOT saved to the database unless the user clicks Save
- `useNIHBSReport` reads `batch.grafts_accepted || 0` from the batch record, which is NULL → 0
- Result: NIHBS report shows 0 even when grafts clearly exist and have progressed

## 3. Impact Analysis
* **Files Modified:**
  * `src/hooks/useNIHBSReport.ts`
  * `src/hooks/useRearingGroupReport.ts`
  * `src/components/rearing-groups/RearingGroupReport.tsx`
  * `docs/features/nihbs-monthly-returns.md`
  * `docs/features/reports.md`
  * `docs/features/batch-distributions.md`
* **RLS Migration:** Added "Group owners can view member grafts" SELECT policy on `batch_grafts`

## 4. Execution Plan
- [x] **Step 1:** In `useNIHBSReport.ts`, fetch `batch_grafts` (id, batch_id, status) alongside `graft_distributions` (graft_id, distribution_type) for fallback derivation
- [x] **Step 2:** For `sold` grafts, check `distribution_type` to determine actual stage: queen_cell → accepted only, virgin_queen → hatched, mated_queen → hatched + mated
- [x] **Step 3:** Use `batch.grafts_accepted ?? derivedCounts.grafts_accepted` (same for hatched/mated) with `??` nullish coalescing
- [x] **Step 4:** Apply same fix to `useRearingGroupReport.ts` + rename "Grafts Accepted" → "Sealed Cells" label
- [x] **Step 5:** Add RLS policy on `batch_grafts` for group owners to SELECT member grafts
- [x] **Step 6:** Remove stale queen_cell subtraction from `useRearingGroupReport.ts`
- [x] **Step 7:** Update documentation
- [x] **Step 8:** Prompt user to test the build

## 5. Post-Task Review
* **Root Cause Found:** The NIHBS and rearing group reports used `batch.grafts_accepted || 0` which returned 0 when the batch counter was NULL. The Batch Quantities UI auto-derives counters from individual graft statuses via `useBatchGrafts`, but those values only populate the edit form state — not saved to DB unless user clicks Save.
* **Additional Bug Found:** The initial graft-derived fallback blindly counted `sold` grafts as hatched/mated, but `sold` just means "distributed" — a sealed cell distribution never hatched. Fixed by cross-referencing `graft_distributions.distribution_type`.
* **Additional Bug Found:** `useRearingGroupReport.ts` still had the old queen_cell subtraction from queens_hatched/queens_mated. Removed.
* **Additional Bug Found:** `batch_grafts` RLS only allowed `user_id = auth.uid()`, so group owners couldn't read member grafts. Added SELECT policy for group owners.
* **Summary of Changes:**
  1. Both hooks now fetch `batch_grafts` + `graft_distributions` in parallel to derive counters when batch-level values are NULL
  2. `sold` grafts correctly categorised by distribution_type (queen_cell/virgin_queen/mated_queen)
  3. Renamed "Grafts Accepted" → "Sealed Cells" in Monthly Rearing Report
  4. Removed stale queen_cell subtraction from rearing group report
  5. Added RLS policy on `batch_grafts` for group owner access
  6. Updated all 3 feature docs
