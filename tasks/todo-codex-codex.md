# Task: Dashboard Review Fixes
**Date:** 12/03/2026
**Status:** Completed

## 1. Objective
Resolve the follow-up review findings for the dashboard landing page so recent activity dates stay correct for timestamp-backed records, record deep links still work for archived hives, and transient scale API failures do not get cached as misleading empty data.

## 2. Impact Analysis
* **Files to Modify:** * `src/app/dashboard/page.tsx`
  * `src/app/dashboard/records/page.tsx`
  * `src/components/dashboard/ApiaryWeatherRow.tsx`
  * `docs/features/dashboard-landing-page-follow-up-plan.md`
  * `tasks/todo-codex.md`
* **Simplicity Check:** Keep this limited to the three reviewed regressions. Do not alter the broader dashboard redesign, query structure, or navigation patterns beyond the bugfixes required to make the existing behaviour correct.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Re-check the affected dashboard, records, and apiary-card paths against the review comments and document this remediation pass.
- [x] **Step 2:** Restore timestamp-aware date rendering for recent activity while keeping date-only records on local calendar formatting.
- [x] **Step 3:** Ensure record deep links unhide archived hives and stop caching empty or partial scale results after transient API failures.
- [x] **Step 4:** Update the dashboard follow-up documentation, mirror completion into `tasks/todo-codex.md`, and prompt the user to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The earlier dashboard follow-up mixed date-only and timestamp formatting in the same helper, assumed record deep links could rely on default archive filters, and treated failed per-scale API calls as cacheable empty data.
* **Summary of Changes:** Added timestamp-aware recent-activity formatting for datetime-backed records, forced archived hives visible when opening dashboard record deep links, and limited scale cache/state updates to fully successful scale refreshes.
* **Notes for User:** Build tests were not run per repository instruction. Please test the dashboard landing page, recent-activity record links for archived hives, and apiary cards after a temporary scale API failure or refresh.
