# Task: Dashboard Apiary Queenright Status
**Date:** 14/03/2026
**Status:** Completed

## 1. Objective
Add a queenright status to each dashboard apiary card so the card shows whether the apiary has recent evidence of a queen from inspections that recorded either eggs present or queen seen, and show a warning state when that evidence is older than three weeks.

## 2. Impact Analysis
* **Files to Modify:** * `src/types/dashboard.ts`
  * `src/hooks/useDashboardStats.ts`
  * `src/components/dashboard/ApiaryWeatherRow.tsx`
  * `docs/features/dashboard-apiary-weather.md`
  * `docs/features/dashboard-apiary-queenright-status-plan.md`
* **Simplicity Check:** Kept the change inside the existing dashboard enrichment and card rendering flow. The card now consumes one extra derived field rather than introducing a new dashboard service, schema change, or separate request path.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Extend the dashboard apiary type and enrichment logic to derive the most recent apiary-level queenright signal from inspections where either `eggs_present` or `queen_seen` is true, while treating null inspection flags safely.
- [x] **Step 2:** Update the apiary dashboard card UI to show the queenright status alongside hives, last inspection, and tasks, with a clear warning state when the signal is older than 21 days.
- [x] **Step 3:** Update documentation in `docs/features/dashboard-apiary-queenright-status-plan.md`
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The dashboard apiary card only exposed hive count, inspection recency, and task count, even though the inspection data model already contained queenright evidence fields that could be surfaced safely.
* **Summary of Changes:** Added `lastQueenrightDate` to the dashboard apiary model, derived it from the latest inspection in each apiary where either `queen_seen` or `eggs_present` is true, rendered that recency on the apiary card, and flagged signals older than 21 days with a warning treatment.
* **Notes for User:** The live schema was checked through the MCP database connection. `public.inspections.queen_seen` and `public.inspections.eggs_present` are nullable booleans, so the dashboard derivation now treats null as no queenright signal. Build tests were not run per repository instruction.

## Review
Extended the existing dashboard apiary enrichment path rather than creating a separate queen-status fetch. The card now shows a compact `Queenright` status, uses the latest positive inspection signal across the apiary, warns after 21 days, and falls back to `No record` or `—` when there is no reliable signal to display.
