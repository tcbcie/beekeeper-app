# Task: Queen Ledger Table Layout
**Date:** 01/04/2026
**Status:** Completed

## 1. Objective
Convert the Queen Ledger from stacked individual cards into a denser table layout so larger queen lists are easier to scan, while keeping key actions directly accessible and moving the fuller detail set into expandable rows.

## 2. Impact Analysis
* **Files to Modify:** * `QueenTrackerTab.tsx`
  * `queen-tracker.md`
  * `queen-ledger-table-layout-plan.md`
  * `todo-codex.md`
  * `todo-codex-codex.md`
* **Simplicity Check:** Keep the change in the Queen Ledger presentation layer only. The ledger hook, filtering logic, permissions, and NIHBS boundary remain unchanged.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Replace the current card-per-queen list with a responsive ledger table that surfaces the most important scanning columns in the main row.
- [x] **Step 2:** Keep overwintering and hybridisation actions directly accessible in the main row, while moving the broader queen, breeding, and destination context into an expandable detail row.
- [x] **Step 3:** Rework the existing legend so it fits the new table model and still explains statuses, badges, and inline actions clearly.
- [x] **Step 4:** Update documentation in `docs/features/queen-tracker.md`
- [x] **Step 5:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The card-per-record presentation carried enough detail for individual inspection but became visually inefficient when the ledger grew, which made it harder to read the estate clearly even after filtering.
* **Summary of Changes:** Replaced the stacked card list with a denser table, kept key outcome actions on the main row, moved richer context into expandable detail rows, and updated the legend to match the new interaction model.
* **Notes for User:** This is a presentation-only change. Build tests were not run per repository instruction.

## Review
* **Scope Covered:** Queen Ledger table layout conversion.
* **Summary of Changes:** The ledger now behaves as a scan-friendly table with direct row actions and expandable detail rows, making larger queen sets easier to understand at a glance.
* **Notes for User:** Please check the Queen Ledger table on desktop and mobile in your normal build flow, especially horizontal scrolling, row expansion, and inline overwintered or hybridised updates.
