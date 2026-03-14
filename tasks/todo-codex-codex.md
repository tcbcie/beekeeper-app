# Task: Dashboard Apiary Queenright Status
**Date:** 14/03/2026
**Status:** Completed

## 1. Objective
Add a queenright status to each dashboard apiary card so the card shows whether the apiary has recent evidence of a queen from inspections that recorded either eggs present or queen seen, and show a warning state when that evidence is older than three weeks.

## 2. Impact Analysis
* **Files to Modify:** * `src/types/dashboard.ts`
  * `src/hooks/useDashboardStats.ts`
  * `src/components/dashboard/ApiaryWeatherRow.tsx`
  * `docs/features/dashboard-apiary-queenright-status-plan.md`
  * `tasks/todo-codex.md`
* **Simplicity Check:** Keep the change contained to the existing dashboard enrichment and card rendering flow. Reuse the current apiary fetch path and add one derived status field rather than introducing a new dashboard service or separate query layer.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Extend the dashboard apiary type and enrichment logic to derive the most recent apiary-level queenright signal from inspections where either `eggs_present` or `queen_seen` is true, while treating null inspection flags safely.
- [x] **Step 2:** Update the apiary dashboard card UI to show the queenright status alongside hives, last inspection, and tasks, with a clear warning state when the signal is older than 21 days.
- [x] **Step 3:** Update documentation in `docs/features/dashboard-apiary-queenright-status-plan.md`
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The dashboard apiary card only exposes hive count, inspection recency, and task count, even though the inspection data model already contains queenright evidence fields that can be surfaced.
* **Summary of Changes:** Added a derived `lastQueenrightDate` field to dashboard apiaries, surfaced it on the dashboard apiary card, and applied a stale-warning state when the latest queenright evidence is older than 21 days.
* **Notes for User:** The live database schema was checked through the MCP connection. `public.inspections.queen_seen` and `public.inspections.eggs_present` are nullable booleans, so the implementation explicitly treats null as no signal.
