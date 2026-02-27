# Task: Mating Nuc Cell Dropdown Sealed-Only Filter
**Date:** 27/02/2026
**Status:** Completed

## 1. Objective
Restrict the `Cell/Graft` dropdown in the Mating Nuc form so only `sealed` cells are available for selection.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/components/batches/MatingNucsTab.tsx`
  * `docs/features/mating-nucs.md`
  * `tasks/todo.md`
* **Simplicity Check:** Keep the change local to the existing `filteredGrafts` computation and preserve the current form flow/UI, only tightening eligibility to `sealed` status.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Update the batch-linked graft filtering in `MatingNucsTab.tsx` to include only rows where `status === 'sealed'`.
- [x] **Step 2:** Keep existing selection/reset behaviour unchanged and ensure no other status appears in the dropdown list.
- [x] **Step 3:** Update documentation in `docs/features/mating-nucs.md`.
- [x] **Step 4:** Prompt user to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The cell filter allowed all non-`in_nuc` statuses, so failed/other non-sealed cells appeared in the Mating Nuc `Cell/Graft` selector.
* **Summary of Changes:** Tightened the selected-batch graft filter in `MatingNucsTab.tsx` to `status === 'sealed'` only, keeping the existing batch selection and graft reset behaviour unchanged. Updated mating nuc feature documentation to match.
* **Notes for User:** Build/tests were not run (per project instruction). Please test by selecting a batch in the Mating Nuc form and confirming only sealed cells are listed.
