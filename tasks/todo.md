# Task: Inspection Clear Button Visibility Improvement
**Date:** 28/02/2026
**Status:** Completed

## 1. Objective
Improve visibility and tap-target clarity of the `Clear` controls in the inspection Behaviour Ratings section so users do not miss them.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/components/records/forms/InspectionForm.tsx`
  * `docs/features/inspection-clear-button-visibility-fix-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** Keep the change isolated to the `renderStarRating` clear control styling and layout, without changing form logic, data flow, or shared component defaults.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Update the star-rating `Clear` button visual treatment (background/border/size/weight) so it remains noticeable in both light and dark themes.
- [x] **Step 2:** Ensure the `Clear` control retains compact layout while meeting touch-target usability and does not interfere with existing label alignment.
- [x] **Step 3:** Update documentation in `docs/features/inspection-clear-button-visibility-fix-plan.md`
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The Behaviour `Clear` controls used a low-emphasis text-only style, which visually blended into the header row and was easy to miss beside the star buttons.
* **Summary of Changes:** Updated the `renderStarRating` `Clear` button styling in `InspectionForm` to use a compact secondary-button treatment with border, elevated background, stronger text weight, and a defined minimum touch height.
* **Notes for User:** No logic or database changes were made. Build/tests were not run locally per project instruction. Please run your normal build check and verify the Behaviour `Clear` controls are now clearly visible and easy to tap.

## Review
* Improved visual prominence of the Behaviour `Clear` controls while keeping the form layout compact.
* Preserved existing interaction behaviour and value-reset logic (`onChange(0)` unchanged).
* Updated feature documentation at `docs/features/inspection-clear-button-visibility-fix-plan.md`.
