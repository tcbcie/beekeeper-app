# Task: Queen Ledger Outcome Column Compaction
**Date:** 01/04/2026
**Status:** Completed

## 1. Objective
Tighten the Queen Ledger table by replacing the separate `Overwintered` and `Hybridised` columns with one compact action area that stacks both toggles vertically, while moving the editable outcome dates into the expanded detail section.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/QueenTrackerTab.tsx`
  * `docs/features/queen-tracker.md`
  * `docs/features/queen-ledger-outcome-column-compaction-plan.md`
  * `tasks/todo-codex.md`
  * `tasks/todo-codex-codex.md`
* **Simplicity Check:** This approach keeps the existing data model, handlers, permissions, and NIHBS boundary intact. The work stays inside the ledger table presentation and the expanded detail layout instead of changing the hook or database behaviour.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Compact the main-row outcome controls in `src/components/batches/QueenTrackerTab.tsx` so `Overwintered` and `Hybridised` share one stacked action area without inline date inputs.
- [x] **Step 2:** Add editable overwintered and hybridisation date controls to the expanded detail section so users can still record or correct dates from the same ledger record.
- [x] **Step 3:** Tighten the status and action layout so the table uses horizontal space more efficiently without changing the underlying ledger logic.
- [x] **Step 4:** Update documentation in `docs/features/queen-tracker.md`
- [x] **Step 5:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The table was rendering two separate outcome columns, each with a full toggle-plus-date editor, so the left side of the ledger consumed too much width and weakened list scanning across larger estates.
* **Summary of Changes:** Collapsed the two outcome columns into one compact stacked action area, moved editable outcome dates into the expanded Outcomes panel, and tightened the surrounding row widths so the ledger reads more cleanly.
* **Notes for User:** This was a UI-only pass inside the Queen Ledger component. Build tests were not run per repository instruction.

## Review
* **Scope Covered:** Queen Ledger outcome column compaction.
* **Summary of Changes:** The main row now keeps one compact actions column with stacked `Overwintered` and `Hybridised` toggles, while date entry for both outcomes has moved into the expanded details.
* **Notes for User:** Please test the Queen Ledger in your normal build flow, especially row width, action density, and outcome date entry inside expanded records.
