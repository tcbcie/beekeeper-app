# Task: Queen Tracker Default Collapse
**Date:** 31/03/2026
**Status:** Completed

## 1. Objective
Collapse the Queen Tracker record detail panels by default so each queen card opens in a more compact summary state until the user explicitly expands it.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/QueenTrackerTab.tsx`
  * `docs/features/queen-tracker.md`
  * `docs/features/queen-tracker-default-collapsed-detail-plan.md`
  * `tasks/todo-codex.md`
  * `tasks/todo-codex-codex.md`
* **Simplicity Check:** Keep the change local to the existing tracker card expand/collapse behaviour. Reuse the current `expandedId` state rather than introducing a new interaction model or changing any tracker data flow.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Update `QueenTrackerTab.tsx` so the record detail grid is collapsed by default on desktop as well as mobile, while keeping the existing expand state model.
- [x] **Step 2:** Make the expand/collapse control visible and clear in the collapsed default state across breakpoints without changing the card data content.
- [x] **Step 3:** Update documentation in `docs/features/queen-tracker.md`
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The Queen Tracker card body was forced open on desktop by a layout class, so the detail panels were always visible even though the component already had a per-record expand state.
* **Summary of Changes:** Removed the desktop forced-open detail body, exposed the expand/collapse control on all breakpoints with a clearer label, and updated the Queen Tracker documentation to describe the collapsed-by-default interaction.
* **Notes for User:** No database work was required. Build tests were not run per repository instruction. Please test the `Queen Tracker` tab in your normal build flow.

## Review
* **Scope Covered:** Default collapsed state for Queen Tracker record details.
* **Summary of Changes:** Queen Tracker cards now show the summary header first and keep the detail grid hidden until the user clicks `Show details`, on desktop and mobile alike.
* **Notes for User:** Please verify expand/collapse behaviour on both desktop and mobile widths before running your normal build check.
