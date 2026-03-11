# Task: Queen Rearing Planning Dark Mode Alignment
**Date:** 11/03/2026
**Status:** Awaiting Approval

## 1. Objective
Bring the Queen Rearing `Planning` tab into a consistent dark-mode treatment so the snapshot panels, badges, nested surfaces, and supporting sections all render clearly and cohesively in dark theme.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/QueenRearingPlanningTab.tsx`
  * `docs/features/queen-rearing.md`
  * `docs/features/queen-rearing-planning-dark-mode-alignment-plan.md`
* **Simplicity Check:** Keep this limited to theme styling within the `Planning` tab. Do not change the planner calculations, layout structure beyond what theme consistency requires, or any database behaviour.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [ ] **Step 1:** Audit the `Planning` tab snapshot and supporting sections for light-only backgrounds, borders, and badge colours that break in dark mode.
- [ ] **Step 2:** Replace those theme mismatches in `src/components/batches/QueenRearingPlanningTab.tsx` with dark-aware surfaces and accent treatments that remain legible and visually consistent.
- [ ] **Step 3:** Update the relevant Queen Rearing documentation in `docs/features/` to note the dark-mode alignment of the planner snapshot.
- [ ] **Step 4:** Mirror the approved checklist into `tasks/todo-codex.md`, mark items off as they are completed, append the review summary, and then prompt the user to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** Several planner sub-components still use light-biased nested surfaces and accent badges, so dark mode ends up feeling only partially themed.
* **Summary of Changes:** Pending approval.
* **Notes for User:** No database MCP work is expected. I will not run build tests; I will ask you to verify the dark-mode UI once the theme alignment is ready.
