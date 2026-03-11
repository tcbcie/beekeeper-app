# Task: Queen Rearing Planning Summary Card Readability
**Date:** 11/03/2026
**Status:** Awaiting Approval

## 1. Objective
Improve the readability of the Queen Rearing `Planning` tab summary cards so single dates and planning ranges are easier to scan, especially where weekday labels currently wrap awkwardly.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/QueenRearingPlanningTab.tsx`
  * `docs/features/queen-rearing.md`
  * `docs/features/queen-rearing-planning-summary-card-readability-plan.md`
* **Simplicity Check:** Keep the change limited to the presentation of the top planning summary cards. Leave the planner calculations, state flow, and downstream milestone logic untouched.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [ ] **Step 1:** Refactor the top summary-card rendering in `src/components/batches/QueenRearingPlanningTab.tsx` so dates and weekdays are presented as structured lines instead of one wrapped text string.
- [ ] **Step 2:** Tighten the card layout, spacing, and responsive behaviour so date ranges remain readable across the current card grid.
- [ ] **Step 3:** Update the relevant Queen Rearing documentation in `docs/features/` to describe the improved planner summary presentation.
- [ ] **Step 4:** Mirror the approved checklist into `tasks/todo-codex.md`, mark items off as they are completed, append the review summary, and then prompt the user to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The summary cards currently compress dates and weekdays into single strings, which wrap poorly and make planning ranges harder to parse quickly.
* **Summary of Changes:** Pending approval.
* **Notes for User:** No database MCP work is expected. I will not run build tests; I will ask you to verify the UI once the change is ready.
