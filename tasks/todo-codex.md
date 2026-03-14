# Task: Inspection Given/Taken Mobile Entry Fix
**Date:** 14/03/2026
**Status:** Completed

## 1. Objective
Rename the inspection form section from `Frames Given/Taken` to `Given/Taken`, allow signed values for each adjustment field, and replace the current mobile-unfriendly numeric entry with a more practical touch-first control.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/records/forms/InspectionForm.tsx`
  * `src/components/records/cards/InspectionCard.tsx`
  * `docs/features/inspection-given-taken-mobile-entry-plan.md`
* **Simplicity Check:** Keep the change contained to the inspection given/taken UI and its display card. Reuse the existing inspection form patterns where possible instead of introducing a new global input system.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Replace the current given/taken heading and raw numeric inputs with a touch-friendly signed-entry control that works reliably on mobile for the six adjustment fields.
- [x] **Step 2:** Update the inspection record summary so negative given/taken values are displayed correctly instead of being hidden by the current `> 0` checks.
- [x] **Step 3:** Update documentation in `docs/features/inspection-given-taken-mobile-entry-plan.md`
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The inspection form uses plain `type="number"` inputs with `min="0"` and coercion back to `0`, while the inspection card only renders given/taken entries when values are greater than zero.
* **Summary of Changes:** Renamed the section to `Given/Taken`, replaced the browser-native number fields with signed touch-first controls, normalised signed drafts before submit, and updated the inspection card to show all non-zero signed adjustments.
* **Notes for User:** Build tests will not be run per repository instruction. The `public.inspections` given/taken columns were checked through the MCP database connection and are plain integer fields with default `0` and no matching signed-value `CHECK` constraints.

## Review
Reworked the inspection given/taken entry flow without widening the change beyond the form and the inspection card. Mobile entry now uses explicit decrement and increment controls with quick signed jumps, direct input still works, and saved negative adjustments remain visible in the record summary.
