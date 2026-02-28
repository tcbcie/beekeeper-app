# Task: Inspection Queen Cells Mobile Toggle Layout Fix
**Date:** 28/02/2026
**Status:** Completed

## 1. Objective
Fix the mobile layout in the `Queen Cells` subsection so YES/NO controls do not overflow or overlap labels, and apply the same responsive correction to equivalent control rows in this inspection screen.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/components/records/forms/InspectionForm.tsx`
  * `docs/features/inspection-mobile-queen-cells-toggle-alignment-fix-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** Keep the change strictly to responsive Tailwind classes in shared render helpers so all affected UI rows inherit the fix without changing business logic, data flow, or API interactions.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Refactor `renderCellSection` header actions for mobile-safe wrapping/stacking so title and YES/NO controls remain fully visible.
- [x] **Step 2:** Audit and align similar compact control rows in `InspectionForm` to use the same mobile-safe pattern where needed.
- [x] **Step 3:** Update documentation in `docs/features/inspection-mobile-queen-cells-toggle-alignment-fix-plan.md`
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** Compact action rows in the inspection form used rigid horizontal alignment (`label + controls`) with fixed-width button spacing, which caused overflow and overlap on narrow mobile viewports.
* **Summary of Changes:** Updated `renderCellSection` to use mobile-first stacked/grid alignment for YES/NO controls, and aligned similar compact rows by improving behaviour rating header action responsiveness and narrow-width button sizing behaviour.
* **Notes for User:** No domain logic changed. This is a UI-only responsive class update in `InspectionForm`. Build/tests were not run locally per project instruction; please run your normal build check and verify on a narrow mobile viewport.

## Review
* Fixed Queen Cells row action overflow by replacing single-line alignment with mobile-safe stacked/grid controls.
* Applied the same responsive hardening pattern to similar compact label/action rows in the same form.
* Kept desktop behaviour intact by scoping layout changes with `sm` breakpoints.
