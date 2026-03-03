# Task: Subtract Distributed Sealed Queen Cells from Batch Display
**Date:** 03/03/2026
**Status:** Completed

## 1. Objective
On the batches page, "Queens Hatched" and "Queens Mated" show raw database values without subtracting distributed sealed queen cells (`distribution_type = 'queen_cell'`). The NIHBS report already does this subtraction — the batch page display should match.

## 2. Impact Analysis
* **Files to Modify:** `src/app/dashboard/batches/page.tsx`
* **Simplicity Check:** Fetch queen_cell distribution counts alongside batches, then subtract from displayed values. No changes to database, forms, or other components.

## 3. Execution Plan
- [x] **Step 1:** In `fetchBatches()`, after fetching batches, also fetch `graft_distributions` where `distribution_type = 'queen_cell'` for those batches. Store a map of `{ batchId: sealedCellCount }`.
- [x] **Step 2:** In the **mobile card view**, subtract the sealed cell count from `queens_hatched` and `queens_mated` display values using `Math.max(0, value - distributed)`. Added a note showing count of distributed sealed cells.
- [x] **Step 3:** In the **desktop table view**, apply the same subtraction with a `*` indicator (hover for details).
- [x] **Step 4:** In the **form counters**, added an info note below "Queens Hatched" and "Queens Mated" showing e.g. "4 sealed cells distributed — report shows 0". Form inputs remain raw/editable.
- [x] **Step 5:** Prompt user to test the build.

## 4. Post-Task Review
* **Summary of Changes:** Modified `src/app/dashboard/batches/page.tsx` only. Added a `sealedCellCounts` state variable and a secondary query in `fetchBatches()` to count queen_cell distributions per batch. Applied `Math.max(0, raw - distributed)` to display values in both mobile cards and desktop table. Added info notes on the form counters so users understand the difference between raw and report values.
* **Scope:** Single file change, ~30 lines added. No database, hook, or component changes.
