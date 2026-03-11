# Task: Queen Rearing Batch Grafts Dark Mode Refinement
**Date:** 11/03/2026
**Status:** Completed

## 1. Objective
Fix the remaining dark-mode regressions in the Queen Rearing batch-grafts area so the `Individual Cells/Grafts`, `Cell Frame`, and `Queen Tracking` sections render with proper contrast and coherent surfaces in dark theme.

## 2. Impact Analysis
* **Files to Modify:** * `src/app/dashboard/batches/page.tsx`
  * `src/components/batches/BatchGraftsSection.tsx`
  * `src/components/batches/GraftHelpBanner.tsx`
  * `src/components/batches/DistributionList.tsx`
  * `src/components/batches/CellFrame.tsx`
  * `src/components/batches/QueenTrackingSection.tsx`
  * `src/components/batches/graftConstants.ts`
  * `docs/features/queen-rearing.md`
  * `docs/features/queen-rearing-batch-grafts-dark-mode-refinement-plan.md`
  * `tasks/todo-codex.md`
* **Simplicity Check:** Keep this limited to theme and contrast fixes in the batch-grafts UI shell and its immediate child components. Do not change graft workflow behaviour, data flow, or the underlying batch logic.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Audit the batch-grafts components for light-biased table rows, panel backgrounds, status chips, and control states that break in dark mode.
- [x] **Step 2:** Update the affected components and shared graft colour tokens so tables, frame controls, row states, and status badges remain legible and consistent in dark theme.
- [x] **Step 3:** Update the relevant Queen Rearing documentation in `docs/features/` to note the dark-mode refinement of the batch-grafts area.
- [x] **Step 4:** Mirror the approved checklist into `tasks/todo-codex.md`, mark items off as they are completed, append the review summary, and then prompt the user to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The batch-grafts area still mixed light-theme table surfaces and older badge tokens into dark mode, leaving large sections washed out or unreadable.
* **Summary of Changes:** Replaced the light-biased outer grafts wrapper with a neutral surfaced shell, aligned the individual grafts section, frame, queen tracking table, and distribution cards with darker surfaces, and hardened the shared graft status tokens so chips and badges remain consistent across the full batch-grafts flow.
* **Notes for User:** No database MCP work was required. I did not run build tests, per repo instruction; please verify the dark-mode UI in your normal browser/build check.
