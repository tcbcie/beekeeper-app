# Task: Records New Record Dropdown Icon Contrast Fix
**Date:** 01/03/2026
**Status:** Completed

## 1. Objective
Improve icon and label contrast in the Records `New Record` dropdown so all options remain clearly readable in dark mode, including hover, focus, and active states.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/components/records/NewRecordDropdown.tsx`
  * `docs/features/records-new-record-dropdown-icon-contrast-fix-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** Keep this as a surgical styling-only update in the dropdown component by tightening row state classes and icon presentation, with no behavioural, API, or schema changes.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Refine dropdown row state classes (default, hover, focus-visible, active) to enforce high-contrast foreground/background combinations in dark mode.
- [x] **Step 2:** Increase icon legibility by using explicit icon classes (size/stroke/colour) that stay clear across interaction states.
- [x] **Step 3:** Update documentation in `docs/features/records-new-record-dropdown-icon-contrast-fix-plan.md`
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The dropdown relied on mixed state classes where icon and text contrast could degrade in dark mode during interaction states, especially with small icon sizing and inherited colouring.
* **Summary of Changes:** Updated dropdown row state classes to explicit high-contrast values for hover, focus-visible, and active states, and strengthened icon readability with explicit icon colour classes plus larger, heavier icons.
* **Notes for User:** No database or schema changes were made. Build/tests were not run locally per project instruction; please run your normal build check and verify the `New Record` dropdown contrast in the Records page.

## Review
* Implemented a surgical UI-only contrast fix in `src/components/records/NewRecordDropdown.tsx`.
* Updated feature documentation in `docs/features/records-new-record-dropdown-icon-contrast-fix-plan.md`.
* Completed task checklist and prompted user-side build verification.
