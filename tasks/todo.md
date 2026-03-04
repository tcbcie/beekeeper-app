# Task: NIHBS Report — Fallback to Graft-Derived Counters When Batch Counters Are NULL
**Date:** 04/03/2026
**Status:** In Progress

## 1. Objective
The NIHBS report shows 0 for grafts_accepted/queens_hatched/queens_mated when batch-level counters are NULL in the database. The Batch Quantities UI correctly derives these from individual graft statuses, but the NIHBS report only reads the batch record. Fix the NIHBS report to fall back to graft-derived counts when batch counters are NULL.

## 2. Root Cause
- `useBatchGrafts` hook auto-calculates counters from graft statuses and populates the batch edit form
- These calculated values only exist in form state — they are NOT saved to the database unless the user clicks Save
- `useNIHBSReport` reads `batch.grafts_accepted || 0` from the batch record, which is NULL → 0
- Result: NIHBS report shows 0 even when grafts clearly exist and have progressed

## 3. Impact Analysis
* **Files to Modify:** `src/hooks/useNIHBSReport.ts`
* **Simplicity Check:** Single file change — add a batch_grafts query and use graft-derived counts as fallback when batch counters are NULL

## 4. Execution Plan
- [x] **Step 1:** In `useNIHBSReport.ts`, after fetching batches, fetch all `batch_grafts` (id, batch_id, status) for the batch IDs
- [x] **Step 2:** Group grafts by batch_id and compute derived counts using the same logic as `useBatchGrafts`:
  - `grafts_accepted` = count where status NOT IN ('grafted', 'failed')
  - `queens_hatched` = count where status IN ('emerged', 'in_nuc', 'mated', 'sold')
  - `queens_mated` = count where status IN ('mated', 'sold')
- [x] **Step 3:** When processing each batch, use `batch.grafts_accepted ?? derivedCounts.grafts_accepted` (same for hatched/mated)
- [ ] **Step 4:** Prompt user to test the build

## 5. Post-Task Review
* **Root Cause Found:** The NIHBS report used `batch.grafts_accepted || 0` which returned 0 when the batch counter was NULL. The Batch Quantities UI auto-derives counters from individual graft statuses via `useBatchGrafts`, but those values only populate the edit form state — they're not saved to the database unless the user clicks Save.
* **Summary of Changes:** Added a `batch_grafts` query in `useNIHBSReport.ts` to derive counters (grafts_accepted, queens_hatched, queens_mated) from individual graft statuses. Uses `??` (nullish coalescing) so explicit batch-level values take precedence, but NULL falls back to graft-derived counts. Same derivation logic as `useBatchGrafts` hook.
* **Notes for User:** Please test the NIHBS report and Excel export — February should now show Grafts Accepted = 12 (derived from grafts) instead of 0.
