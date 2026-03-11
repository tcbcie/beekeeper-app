# Task: Queen Rearing Planner Emergence Date Input
**Date:** 11/03/2026
**Status:** Completed

## 1. Objective
Extend the Queen Rearing `Planning` tab so the user can plan from either a graft date or a virgin queen emergence date, instead of being limited to graft-date-first planning.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/QueenRearingPlanningTab.tsx`
  * `docs/features/queen-rearing.md`
  * `docs/features/queen-rearing-planning-emergence-date-input-plan.md`
* **Simplicity Check:** Keep the planner local and client-side. Add one explicit date-mode choice with a single derived timeline, rather than introducing multiple independent date fields that can drift out of sync.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Refactor `src/components/batches/QueenRearingPlanningTab.tsx` so the planner has a clear source date mode, allowing the timeline to be derived from either `graft date` or `virgin emergence date` while preserving the existing behaviour as one of the options.
- [x] **Step 2:** Update the planner controls and summary cards so the user can switch modes, enter the selected source date, and still see the counterpart date calculated explicitly in the timeline.
- [x] **Step 3:** Keep the downstream queen and drone timing calculations aligned to the same derived emergence date so mating, laying, and drone readiness remain internally consistent.
- [x] **Step 4:** Update the relevant Queen Rearing documentation in `docs/features/` so the planner now records both supported entry points.
- [x] **Step 5:** Mirror the approved checklist into `tasks/todo-codex.md`, mark items off as they are completed, append the review summary, and then prompt the user to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The planner currently assumes graft date is always the starting point, which makes it awkward to work backwards from a desired virgin emergence day.
* **Summary of Changes:** Added a source-date mode to the Queen Rearing planner so the timeline can be driven from either graft date or target virgin emergence day, hardened the planner date handling so cleared or invalid values remain recoverable, and aligned the Queen Rearing documentation with the dual-entry behaviour.
* **Notes for User:** No database MCP work was required. I did not run build tests, per repo instruction; please verify the updated planner behaviour in your normal UI/build check.
