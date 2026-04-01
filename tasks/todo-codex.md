# Task: Queen Ledger Column Reordering
**Date:** 01/04/2026
**Status:** Completed

## 1. Objective
Tighten the Queen Ledger table by moving the `Queen` column to the second position and pushing the compact `Actions` column to the right so the space between queen identity and status is reduced.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/QueenTrackerTab.tsx`
  * `docs/features/queen-tracker.md`
  * `docs/features/queen-ledger-column-reordering-plan.md`
  * `tasks/todo-codex.md`
  * `tasks/todo-codex-codex.md`
* **Simplicity Check:** This keeps the change inside the table layout only. It does not alter the ledger hook, action handlers, permissions, or NIHBS behaviour.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Reorder the Queen Ledger table columns in `src/components/batches/QueenTrackerTab.tsx` so `Queen` becomes the second column and `Actions` moves to the right-hand side.
- [x] **Step 2:** Tighten the queen and status cell widths so the row reads more compactly after the column move.
- [x] **Step 3:** Update documentation in `docs/features/queen-tracker.md`
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The table was placing the compact `Actions` block between `Details` and `Queen`, which broke the row scan and left avoidable dead space before the tighter `Status` column.
* **Summary of Changes:** Reordered the table to `Details`, `Queen`, `Status`, `Destination`, and `Actions`, then tightened the affected cell widths so the summary row reads more efficiently.
* **Notes for User:** This was a UI-only layout change. Build tests were not run per repository instruction.

## Review
* **Scope Covered:** Queen Ledger column reordering.
* **Summary of Changes:** Moved the queen identity next to the detail control, shifted the compact actions block to the right edge, and reduced the main row widths slightly so the table scans more cleanly.
* **Notes for User:** Please test the Queen Ledger in your normal build flow, especially desktop row balance and the right-hand action column on narrower widths.
