# Task: Frame Bulk Date Picker Default to Today
**Date:** 27/02/2026
**Status:** Completed

## 1. Objective
Always pre-populate the frame bulk date picker with the current date when entering frame bulk mode.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/hooks/useBatchGrafts.ts`
  * `src/components/batches/BatchGraftsSection.tsx`
  * `docs/features/queen-rearing.md`
  * `tasks/todo.md`
* **Simplicity Check:** Keep the existing bulk workflow unchanged and only initialise the existing date draft with today's date when bulk mode is entered.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Add a dedicated frame select-mode entry handler in `useBatchGrafts` that sets `selectMode` and initialises `bulkDateDraft` to today when empty.
- [x] **Step 2:** Update `BatchGraftsSection` to use the new entry handler instead of directly calling `setSelectMode(true)`.
- [x] **Step 3:** Update documentation in `docs/features/queen-rearing.md`.
- [x] **Step 4:** Prompt user to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The frame bulk date draft was initialised as empty and only changed after user input, so the bulk date picker had no default value when entering bulk mode.
* **Summary of Changes:** Added an `enterSelectMode` handler in `useBatchGrafts` to initialise the frame bulk date draft to today's date and reset staged status/date state for each bulk session. Updated `BatchGraftsSection` to call this handler when entering frame bulk mode. Added a guard so default date prefill does not cause accidental save when no real change is staged.
* **Notes for User:** Build/tests were not run (per project instruction). Please test the frame bulk bar and confirm the date picker is pre-populated with today's date each time you enter bulk mode.
