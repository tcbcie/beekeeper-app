# Task: Rearing Group Report Batch Scope Fix
**Date:** 04/05/2026
**Status:** Completed

## 1. Objective
Fix the rearing group report so it only aggregates batches explicitly linked to the selected rearing group, preventing private batches or batches from another group from being included in the selected group's totals.

## 2. Impact Analysis
* **Files to Modify:** * `src/hooks/useRearingGroupReport.ts`
  * `docs/features/rearing-group-report-batch-scope-fix-plan.md`
  * `tasks/todo-codex.md`
* **Simplicity Check:** The fix is limited to the report data query and documentation. It does not alter group membership, invitations, batch creation, RLS policies, or the normal batch list visibility model.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Update the report batch query to include `rearing_group_id` in the selected fields and filter batches with `.eq('rearing_group_id', groupId)`.
- [x] **Step 2:** Review the derived graft and distribution queries to confirm they continue to use only batch ids from the now group-scoped batch set.
- [x] **Step 3:** Update documentation in `docs/features/rearing-group-report-batch-scope-fix-plan.md`.
- [x] **Step 4:** Update `tasks/todo-codex.md` checklist status and append the post-task review after implementation.
- [x] **Step 5:** Prompt user to test the build and verify the selected group report totals.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The report selected batches by group member user ids and month, but did not require those batches to be linked to the selected rearing group.
* **Summary of Changes:** Scoped the report batch query to the selected `rearing_group_id` and limited queen-cell distribution counts to batch ids that belong to that same group.
* **Notes for User:** No build testing was run per repository instruction. Please test the build and verify the selected group report totals.
