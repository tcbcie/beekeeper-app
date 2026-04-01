# Task: Queen Ledger Action Label And Toggle Split
**Date:** 01/04/2026
**Status:** Completed

## 1. Objective
Fix the Queen Ledger action column so the labels stay as a shallow label row and only the toggle controls form the compact grid, avoiding the taller tile layout that regressed row density.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/QueenTrackerTab.tsx`
  * `docs/features/queen-ledger-action-label-and-toggle-split-plan.md`
  * `docs/features/queen-tracker.md`
* **Simplicity Check:** This is a focused Queen Ledger layout correction. It keeps the current action logic, inline date-capture editor, and outcome write paths intact, and only reworks the presentation so labels and toggles are separated and the rows stay shorter.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Replace the current action tiles with a shallower layout where the four action labels sit as labels and the four controls sit in a compact two-by-two grid beneath them.
- [x] **Step 2:** Keep the inline date-capture editor attached below that control grid so the forced-date workflow stays intact.
- [x] **Step 3:** Tighten spacing so the action column is denser without making the row taller than the earlier layout.
- [x] **Step 4:** Update documentation in `docs/features/queen-tracker.md`
- [x] **Step 5:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The previous action-grid pass wrapped each label and toggle into one tile, which increased the vertical weight of the row and defeated the space-saving goal.
* **Summary of Changes:** Split the action labels from the action controls so the labels stay shallow and the toggles alone form the compact two-by-two grid, while keeping the inline date-capture editor below the controls.
* **Notes for User:** No schema or behaviour change was needed. Build tests were not run per repository instruction.

## Review
* **Scope Covered:** Queen Ledger action label and toggle split.
* **Summary of Changes:** The action column now shows the four action labels as text and keeps only the controls in the compact two-by-two grid, which makes the row lighter and shorter than the previous tile version.
* **Notes for User:** Please check the row height and action-column readability in your normal build flow.
