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
  * `tasks/todo-codex.md`
* **Simplicity Check:** Keep the change inside the existing dashboard enrichment and card rendering flow. Derive one apiary-level risk summary from the inspections already being fetched instead of introducing a new service, route, or schema change.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Extend the dashboard apiary enrichment to calculate per-hive queenright and brood recency, then derive an apiary-level `Possible queen issue` state when any hive lacks a recent queenright signal or has gone more than 21 days without brood.
- [x] **Step 2:** Update the dashboard apiary card UI so the current queenright block becomes a clearer health indicator, including a warning presentation and issue count when one or more hives in the apiary are at risk.
- [x] **Step 3:** Update documentation in `docs/features/dashboard-apiary-queen-issue-warning-plan.md`
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The current card only tracked the latest positive apiary-wide queenright signal, so a single healthy hive could mask another hive that had lost recent queenright evidence or had been broodless for too long.
* **Summary of Changes:** Implemented a per-hive inspection roll-up, added apiary risk counts for queenright and brood issues, and updated the card to show a warning-first `Possible issue` state when any hive is at risk.
* **Notes for User:** The live schema was checked through the MCP connection. `public.inspections.queen_seen` and `public.inspections.eggs_present` are nullable booleans, and `public.inspections.brood_frames` is a nullable integer. The implementation treats null safely and only counts brood when `eggs_present` is true or `brood_frames > 0`.
