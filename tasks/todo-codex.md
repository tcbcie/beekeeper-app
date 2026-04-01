# Task: Queen Ledger Row Selection And Column Pruning
**Date:** 01/04/2026
**Status:** Completed

## 1. Objective
Add a clear selected-row state to the Queen Ledger table, remove low-value summary columns that are already covered by filters, remove stage data from the Queen Ledger UI, and move the remaining context into the expanded detail area so the table remains easier to scan.

## 2. Impact Analysis
* **Files to Modify:** * `QueenTrackerTab.tsx`
  * `queen-tracker.md`
  * `queen-ledger-row-selection-and-column-pruning-plan.md`
  * `todo-codex.md`
  * `todo-codex-codex.md`
* **Simplicity Check:** This keeps the change inside the Queen Ledger presentation layer only. The ledger hook, filtering logic, permissions, and NIHBS boundary remain unchanged.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Add an explicit selected-row visual state so the active queen row is obvious while scanning or expanding the table.
- [x] **Step 2:** Remove the `Group`, `Member`, `Batch`, and `Weight and stage` summary columns from the main table, and rebalance the remaining columns for cleaner scanning.
- [x] **Step 3:** Move the removed group, member, and batch context into the expanded detail area, and remove stage data from the Queen Ledger UI rather than restating it elsewhere.
- [x] **Step 4:** Update documentation in `docs/features/queen-tracker.md`
- [x] **Step 5:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The ledger table still duplicated filter context in the summary scan path, and there was no persistent active-row treatment once the view moved from cards to a denser table.
* **Summary of Changes:** Added a selected-row highlight, reduced the main table to six columns, moved group, member, and batch context into the expanded details, and removed stage data from the Queen Ledger UI.
* **Notes for User:** This is a presentation-only change. Build tests were not run per repository instruction.

## Review
* **Scope Covered:** Queen Ledger row selection and summary-column pruning pass.
* **Summary of Changes:** The ledger now has a persistent selected-row treatment, the main table is reduced to the high-value scanning columns only, and the removed group, member, and batch context now lives in the expanded details. Stage data is no longer shown in the ledger UI.
* **Notes for User:** Please check the Queen Ledger table in your normal build flow, especially row selection, the slimmer table scan, and the moved detail fields inside expanded rows.
