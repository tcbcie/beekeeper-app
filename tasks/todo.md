# Task: Queen Rearing Frame Bulk Status Date Fix
**Date:** 27/02/2026
**Status:** Completed

## 1. Objective
Fix frame bulk updates so selecting a bulk status does not immediately save with today’s date, and instead allows picking a date and saving all changes only when clicking `Done`.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/hooks/useBatchGrafts.ts`
  * `src/components/batches/BatchGraftsSection.tsx`
  * `src/components/batches/CellFrame.tsx`
  * `docs/features/queen-rearing.md`
  * `tasks/todo.md`
* **Simplicity Check:** Keep the existing frame selection workflow and controls, but convert status/date controls to staged values applied in one save action on `Done`, avoiding any broader redesign of batch, table, or distribution behaviour.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Add staged frame bulk edit state in `useBatchGrafts` (pending status and pending date), plus a single commit handler that applies selected staged fields to selected frame grafts.
- [x] **Step 2:** Wire `BatchGraftsSection` so the `Done` button commits staged frame edits first (when present) and then exits select mode.
- [x] **Step 3:** Update `CellFrame` bulk controls to edit staged values only (no immediate DB write on dropdown/date change), and clear drafts when leaving select mode.
- [x] **Step 4:** Update documentation in `docs/features/queen-rearing.md`.
- [x] **Step 5:** Prompt user to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** Frame bulk controls (`Change Status` and date input) were wired directly to DB update handlers (`handleBulkStatusChange` / `handleBulkDateChange`), so selecting a status immediately persisted updates and set `status_date` to the current date before the user could pick a date.
* **Summary of Changes:** Converted frame bulk status/date into staged draft values in `useBatchGrafts`, added `commitFrameBulkChanges()` to persist selected drafts in one update, and changed the `Done` button flow in `BatchGraftsSection` to commit then exit select mode. Updated `CellFrame` bulk controls to controlled draft inputs (no immediate save), and updated queen rearing docs to reflect staged save behaviour.
* **Notes for User:** Build/tests were not run (per project instruction). Please test in the batch frame UI: select cells, choose status, choose date, then click `Done` to confirm updates only apply at save time.
