# Task: Auto-Populate "Grafted from" from Selected Batch
**Date:** 27/02/2026
**Status:** Completed

## 1. Objective
When creating or editing a mating nuc, selecting a batch should auto-populate the `Grafted from` dropdown with the breeder queen from that batch.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/components/batches/MatingNucsTab.tsx`
  * `docs/features/mating-nucs.md`
  * `tasks/todo.md`
* **Simplicity Check:** Keep changes local to the mating nuc form by using existing batch data (`mother_queen_id`) and setting the existing `queen_id` form field on batch selection.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Extend batch fetch in `MatingNucsTab.tsx` to include `mother_queen_id`.
- [x] **Step 2:** Add a batch change handler that sets `batch_id`, resets `graft_id`, and auto-populates `queen_id` from the selected batch breeder queen.
- [x] **Step 3:** Update documentation in `docs/features/mating-nucs.md`.
- [x] **Step 4:** Prompt user to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** Batch selection only set `batch_id` and cleared `graft_id`; it did not map the selected batch's breeder queen into the `queen_id` field.
* **Summary of Changes:** Added `mother_queen_id` to fetched batch data and implemented `handleBatchChange()` in `MatingNucsTab` to auto-set `queen_id` from the selected batch. Updated mating nuc documentation to reflect the new behaviour.
* **Notes for User:** Build/tests were not run (per project instruction). Please test by selecting different batches in the mating nuc form and confirming `Grafted from` updates to the batch breeder queen automatically.
