# Task: New Record Dropdown Contrast Fix
**Date:** 01/03/2026
**Status:** Completed

## 1. Objective
Fix low contrast in the Records page `New Record` dropdown items (specifically the inspection/treatment selection state shown in the screenshot), where light item backgrounds can pair with light text in dark theme.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/components/records/NewRecordDropdown.tsx`
  * `docs/features/new-record-dropdown-contrast-fix-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** Keep this as a local styling fix in the existing dropdown item buttons only, with no behaviour changes, no refactor, and no database impact.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Remove unintended inherited neutral-button visual styles from dropdown rows where they conflict with custom row background/text states.
- [x] **Step 2:** Apply explicit high-contrast text and hover/focus/active colour classes for each dropdown row in both light and dark themes.
- [x] **Step 3:** Update documentation in `docs/features/new-record-dropdown-contrast-fix-plan.md`
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** Dropdown items inherited `Button` neutral skin classes (`fj-btn` / `fj-btn-neutral`) while also applying custom row hover/active colours, creating conflicting state styling and low-contrast text on light interaction backgrounds in dark theme.
* **Summary of Changes:** Updated `NewRecordDropdown` item buttons to `unstyled`, added explicit base/hover/active text and background classes per row colour group, and preserved existing dropdown behaviour.
* **Notes for User:** No database or schema work was required. Build/tests were not run locally per project instruction; please run your normal build check and verify dropdown contrast in dark theme.

## Review
* Implemented a targeted contrast fix for Records `New Record` dropdown item states.
* Kept impact minimal by changing only class composition in `NewRecordDropdown`.
* Updated feature documentation in `docs/features/new-record-dropdown-contrast-fix-plan.md` and completed task tracking in this file.
