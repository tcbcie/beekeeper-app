# Task: Queen Ledger Action Alignment And Reflow
**Date:** 01/04/2026
**Status:** Completed

## 1. Objective
Refine the Queen Ledger action column by centring the action labels over their controls and reflowing the remaining actions cleanly when `Mated` is no longer shown.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/QueenTrackerTab.tsx`
  * `docs/features/queen-ledger-action-alignment-and-reflow-plan.md`
  * `docs/features/queen-tracker.md`
* **Simplicity Check:** This is a surgical layout refinement inside the Queen Ledger component. It keeps the current action logic, inline date-capture editor, and outcome behaviour intact, and only adjusts alignment and conditional grid arrangement.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Centre the action labels over their respective controls so the action cell reads cleanly.
- [x] **Step 2:** Reflow the control grid when `Mated` is absent so the remaining actions do not leave an empty slot.
- [x] **Step 3:** Keep the inline date-capture editor attached below the controls without disturbing the denser action layout.
- [x] **Step 4:** Update documentation in `docs/features/queen-tracker.md`
- [x] **Step 5:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The previous label-and-toggle split still left the grid structure too rigid, so rows without `Mated` kept an awkward dead slot and the labels were not visually anchored over their controls.
* **Summary of Changes:** Centred the action labels, rebuilt the action rows from a dynamic layout map, and collapsed the remaining controls cleanly when `Mated` is absent while keeping the inline date-capture editor attached below.
* **Notes for User:** No schema or behaviour change was needed. Build tests were not run per repository instruction.
