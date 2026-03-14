# Task: Dashboard Apiary Queen Issue Warning
**Date:** 14/03/2026
**Status:** Completed

## 1. Objective
Refine the dashboard apiary cards so they warn when any hive in an apiary lacks a recent queenright signal, and surface a separate `Possible queen issue` state that also takes prolonged lack of brood into account.

## 2. Impact Analysis
* **Files to Modify:** * `src/types/dashboard.ts`
  * `src/hooks/useDashboardStats.ts`
  * `src/components/dashboard/ApiaryWeatherRow.tsx`
  * `docs/features/dashboard-apiary-queen-issue-warning-plan.md`
  * `docs/features/dashboard-apiary-weather.md`
* **Simplicity Check:** Kept the change inside the existing dashboard enrichment and card rendering flow. The card still consumes derived dashboard metadata only, but that metadata now rolls up per-hive inspection signals instead of relying on a single apiary-wide positive date.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Extend the dashboard apiary enrichment to calculate per-hive queenright and brood recency, then derive an apiary-level `Possible queen issue` state when any hive lacks a recent queenright signal or has gone more than 21 days without brood.
- [x] **Step 2:** Update the dashboard apiary card UI so the current queenright block becomes a clearer health indicator, including a warning presentation and issue count when one or more hives in the apiary are at risk.
- [x] **Step 3:** Update documentation in `docs/features/dashboard-apiary-queen-issue-warning-plan.md`
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The previous dashboard badge only tracked the latest positive apiary-wide queenright signal, so one healthy hive could hide another hive with no recent queen signal or a brood break that had gone on too long.
* **Summary of Changes:** Added per-hive dashboard risk roll-up fields, derived apiary warning counts from queenright and brood recency, and changed the card to show `Possible issue` whenever one or more hives need checking.
* **Notes for User:** The live schema was checked through the MCP database connection. `public.inspections.queen_seen` and `public.inspections.eggs_present` are nullable booleans, and `public.inspections.brood_frames` is a nullable integer. The implementation treats null safely and only counts brood when `eggs_present` is true or `brood_frames > 0`. Build tests were not run per repository instruction.

## Review
The dashboard card now works as an apiary health roll-up rather than a single “last good date” badge. Any hive with no recent queenright signal is counted as at risk, while brood only becomes an issue after a confirmed broodless run exceeds 21 days, which avoids flagging short summer brood breaks too early.
