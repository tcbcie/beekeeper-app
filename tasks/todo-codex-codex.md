# Task: Queen Rearing Planning Desktop Dark Layout Reset
**Date:** 11/03/2026
**Status:** Completed

## 1. Objective
Fix the remaining desktop dark-mode issues in the Queen Rearing `Planning` tab so the top planning band reads as one coherent interface instead of a light outer shell with mismatched pastel snapshot cards.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/QueenRearingPlanningTab.tsx`
  * `docs/features/queen-rearing.md`
  * `docs/features/queen-rearing-planning-desktop-dark-layout-reset-plan.md`
  * `tasks/todo-codex.md`
* **Simplicity Check:** Keep this limited to the desktop presentation, contrast, and layout treatment of the `Planning` tab and its surfaced card language. Do not change the planner calculations, dates, state model, or database behaviour.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Audit the current `Planning` top section for light-biased desktop surfaces, weak text contrast, and snapshot cards whose pastel fills do not belong in dark mode.
- [x] **Step 2:** Recompose the top planning band in `src/components/batches/QueenRearingPlanningTab.tsx` into a darker, more coherent desktop layout with consistent surfaced cards, restrained accent usage, and stronger content hierarchy.
- [x] **Step 3:** Update the relevant Queen Rearing documentation in `docs/features/` to note the desktop dark-layout reset for the planner.
- [x] **Step 4:** Mirror the approved checklist into `tasks/todo-codex.md`, mark items off as they are completed, append the review summary, and then prompt the user to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The desktop planner still mixed a pale outer shell with fixed pastel snapshot cards and a stretched control panel, so dark mode felt inconsistent even after earlier token-level fixes.
* **Summary of Changes:** Rebuilt the desktop planner shell around surfaced theme cards, removed the pastel summary fills, stopped the right-hand panel from stretching, and aligned the lower timeline cards with the same accent system.
* **Notes for User:** No database MCP work was required. I did not run build tests, per repo instruction; please verify the desktop planner in your normal browser/build check.
