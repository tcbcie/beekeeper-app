# Task: Queen Ledger Failure Outcome
**Date:** 01/04/2026
**Status:** Completed

## 1. Objective
Add an explicit queen-failure mechanism to the Queen Ledger so users can mark a queen as failed from the row action area and capture a failure date plus a short comment without misusing `overwintered = false`.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/QueenTrackerTab.tsx`
  * `src/hooks/useQueenTracker.ts`
  * `docs/features/queen-tracker.md`
  * `docs/features/queen-ledger-failure-outcome-plan.md`
* **Simplicity Check:** This keeps the new failure mechanism inside the existing ledger model and outcome area instead of creating a parallel workflow. The row trigger stays in the current `Actions` column, while the date and comment capture live in the expanded `Outcomes` panel to avoid widening the table again.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Add an explicit failure outcome model to the Queen Ledger data path so failure is no longer inferred from `overwintered = false`.
- [x] **Step 2:** Add a compact `Fail` action beside the existing overwintering and hybridisation controls in `src/components/batches/QueenTrackerTab.tsx`.
- [x] **Step 3:** Add failure date and short-comment capture to the expanded `Outcomes` panel, with clear save and clear behaviour.
- [x] **Step 4:** Update the ledger status, summary, and filtering logic so `Failed` reflects the explicit failure outcome.
- [x] **Step 5:** Update documentation in `docs/features/queen-tracker.md`
- [x] **Step 6:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The Queen Ledger was treating `Failed` as `overwintered === false`, which conflated a queen-failure outcome with overwintering and left no proper place to record a failure date or comment.
* **Summary of Changes:** Added dedicated failure fields to `graft_distributions`, backfilled historic tracker failures, introduced an explicit failure action in the ledger row, and moved failure date and comment editing into the expanded `Outcomes` panel.
* **Notes for User:** Live MCP verification confirmed the existing schema before the migration was applied. Build tests were not run per repository instruction.
