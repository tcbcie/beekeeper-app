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
* **Simplicity Check:** Keep the work limited to the three reviewed regressions. Avoid any broader dashboard restructuring or further feature expansion.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Re-check the affected dashboard, records, and apiary-card paths against the review comments and document this remediation pass.
- [x] **Step 2:** Restore timestamp-aware date rendering for recent activity while keeping date-only records on local calendar formatting.
- [x] **Step 3:** Ensure record deep links unhide archived hives and stop caching empty or partial scale results after transient API failures.
- [x] **Step 4:** Update the dashboard follow-up documentation, mirror completion into `tasks/todo-codex.md`, and prompt the user to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The earlier dashboard follow-up mixed date-only and timestamp formatting in one path, left deep-linked archived-hive records behind the default archive filter, and cached scale refresh failures as if they were valid empty responses.
* **Summary of Changes:** Restored timestamp-aware recent-activity rendering, enabled archived hives for record deep links, and made scale cache writes contingent on a fully successful per-scale refresh.
* **Notes for User:** Build tests were not run per repository instruction. Please test the dashboard landing page, archived-hive record links from recent activity, and apiary card scale refresh behaviour in your usual browser/build check.

## Review
Applied the three review fixes without expanding the dashboard scope. Recent activity now formats timestamp-backed records with timestamp awareness, record deep links explicitly unhide archived hives before filtering, and apiary scale data no longer overwrites the dashboard cache or card state after transient per-scale API failures.
