# Task: Queen Rearing Planning Summary Layout Refresh
**Date:** 11/03/2026
**Status:** Awaiting Approval

## 1. Objective
Redesign the top summary area of the Queen Rearing `Planning` tab so it reads as a clear planning snapshot instead of a row of cramped equal-width cards.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/QueenRearingPlanningTab.tsx`
  * `docs/features/queen-rearing.md`
  * `docs/features/queen-rearing-planning-summary-snapshot-layout-plan.md`
* **Simplicity Check:** Keep the change focused on the top summary presentation only. Preserve the existing planner calculations, controls, and lower milestone sections.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [ ] **Step 1:** Replace the current five equal summary cards with a clearer summary layout that distinguishes anchor dates from planning ranges.
- [ ] **Step 2:** Simplify the typography and spacing so dates, weekdays, and range boundaries remain legible without nested mini-panels competing for space.
- [ ] **Step 3:** Update the relevant Queen Rearing documentation in `docs/features/` to reflect the new summary layout approach.
- [ ] **Step 4:** Mirror the approved checklist into `tasks/todo-codex.md`, mark items off as they are completed, append the review summary, and then prompt the user to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The current summary section treats every datum as the same kind of card, even though point-in-time dates and date ranges need different visual treatment.
* **Summary of Changes:** Pending approval.
* **Notes for User:** No database MCP work is expected. I will not run build tests; I will ask you to verify the UI once the refreshed layout is ready.
