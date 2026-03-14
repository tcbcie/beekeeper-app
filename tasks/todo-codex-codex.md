# Task: Dashboard Audit Hardening
**Date:** 14/03/2026
**Status:** Completed

## 1. Objective
Harden the dashboard apiary data flow by preventing stale async responses from overwriting newer state, stopping nullable brood fields from being misclassified as explicit brood absence, and preserving partial scale data when one scale fetch fails.

## 2. Impact Analysis
* **Files to Modify:** * `src/hooks/useDashboardStats.ts`
  * `src/components/dashboard/ApiaryWeatherRow.tsx`
  * `docs/features/dashboard-audit-hardening-plan.md`
  * `docs/features/dashboard-apiary-weather.md`
  * `tasks/todo-codex.md`
* **Simplicity Check:** Keep the change limited to the existing dashboard hook and card component. Reuse the current fetch and card pipeline, adding defensive guards and stricter signal interpretation rather than introducing new services, caches, or schema changes.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Add request-scoped guards to the dashboard hook so older async responses cannot overwrite newer dashboard state during retries or rapid reloads.
- [x] **Step 2:** Tighten the queen and brood roll-up logic so nullable brood fields remain unknown rather than being treated as confirmed brood absence, while keeping the 21-day brood-break tolerance intact.
- [x] **Step 3:** Update the dashboard card scale-fetch path to keep valid partial scale data visible even if one or more scale requests fail, and update documentation in `docs/features/dashboard-audit-hardening-plan.md`
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The dashboard data flow relied on mounted-state checks only, inferred brood absence from nullable inspection fields, and aborted scale rendering on partial downstream failures.
* **Summary of Changes:** Added request versioning to the dashboard fetch flow, stopped null brood values from creating false broodless runs, and preserved valid partial scale readings on the apiary card when some scale requests fail.
* **Notes for User:** This is a code-hardening pass only. No database schema change was needed, and build tests were not run per repository instruction.

## Review
The dashboard is now more resilient under latency and partial failures. Older requests can no longer clobber newer state, unknown brood data no longer produces false brood warnings, and one failing scale feed no longer hides successful readings from other hives.
