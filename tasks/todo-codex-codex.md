# Task: Tasks Filter QA Audit
**Date:** 18/09/2026
**Status:** Completed

## 1. Objective
Audit the recent apiary/hive filter changes using the QA engineer skill and harden direct-link behaviour.

## 2. Impact Analysis
* **Files to Modify:** Tasks page, existing feature documentation and task records.
* **Simplicity Check:** Keep corrections inside the already approved filter and direct-link scope. Preserve existing data queries and shared selection storage.

## 3. Execution Plan
*Authorisation: the user requested the QA engineer skill after approving the filter fix, including preservation of direct links. These corrections complete that approved scope.*
- [x] **Step 1:** Audit the diff and related selection flow with an independent source review.
- [x] **Step 2:** Fixed the Medium hive-link filtering regression and guarded incoming hive/task links against restoring known incompatible hive selections. Independent source review found no further issues in the corrections.
- [x] **Step 3:** Ran TypeScript, targeted ESLint and whitespace checks; updated documentation. ESLint and whitespace checks passed. TypeScript reported 97 diagnostics, all in existing test files, with none outside tests. No tests were authored or run; no build was run.

## 4. Post-Task Review
* **Root Cause Found:** Hive-only links added an unintended apiary restriction to tasks with independent apiary associations. Conflicting direct links could also restore a selection cleared by reconciliation in the same effect cycle.
* **Summary of Changes:** Fixed one Medium and one Low issue. Hive-only links use All Apiaries; incoming hive/task links discard known incompatible hive selections before writing shared state. No Critical or High issues were found.
* **Notes for User:** No TypeScript diagnostics outside existing test files; targeted lint and whitespace checks passed. Please verify in the browser and run the build.

## Review
The QA engineer skill audit and independent follow-up review are complete. Both corrections stay within the approved filter/direct-link scope. Repository-wide type-checking remains unsuccessful because of 97 existing test-file diagnostics; changed application code has no reported type errors.

---

# Task: Tasks Apiary and Hive Filter Fix
**Date:** 18/09/2026
**Status:** Completed

## 1. Objective
Make the Tasks & Events Hive dropdown show only hives belonging to the selected apiary, and prevent incompatible hive selections from hiding matching tasks.

## 2. Impact Analysis
* **Files to Modify:** Tasks & Events page, feature documentation and task records.
* **Simplicity Check:** Use the apiary_id already loaded with each hive. Keep the fix local to the Tasks page without extra requests or changes to the shared selection provider.

## 3. Execution Plan
*Plan approved by the user before implementation.*
- [x] **Step 1:** Derive the Hive dropdown options from the selected apiary; All Apiaries continues to show all accessible hives.
- [x] **Step 2:** Clear known incompatible hive selections when switching apiaries and reconcile restored selections once association data is available. Preserve compatible selections, unavailable hive IDs and existing hive/task link behaviour.
- [x] **Step 3:** Reviewed switching apiaries, empty apiaries, shared hives, restored filters and direct links; updated the feature documentation and review notes. Targeted ESLint passed with no warnings or errors; whitespace checks passed.
- [x] **Step 4:** Request user build and browser verification in the hand-off. No build was run.

## 4. Post-Task Review
* **Root Cause Found:** The Hive dropdown rendered all accessible hives, while apiary and hive filters were stored independently without reconciling incompatible selections.
* **Summary of Changes:** Scoped Hive options to the selected apiary, cleared known incompatible selections, aligned hive links with their apiary and preserved missing/archived IDs. Changes are local to the Tasks page.
* **Notes for User:** Targeted ESLint and whitespace checks passed. Source review covered loading failures and direct links. Please run the build and verify the dropdown, switching apiaries, restored filters and task counts in the browser.

## Review
The approved fix is implemented and documented. Review caught and prevented accidental clearing of archived or temporarily unavailable shared-hive selections. No database changes or build tests were performed; live browser verification remains with the user.

---

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
