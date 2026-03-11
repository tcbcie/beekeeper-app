# Task: Queen Rearing Planning Dark Mode Alignment
**Date:** 11/03/2026
**Status:** Completed

## 1. Objective
Bring the Queen Rearing `Planning` tab into a consistent dark-mode treatment so the snapshot panels, badges, nested surfaces, and supporting sections all render clearly and cohesively in dark theme.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/QueenRearingPlanningTab.tsx`
  * `docs/features/queen-rearing.md`
  * `docs/features/queen-rearing-planning-dark-mode-alignment-plan.md`
* **Simplicity Check:** Keep this limited to theme styling within the `Planning` tab. Do not change the planner calculations, layout structure beyond what theme consistency requires, or any database behaviour.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Audit the `Planning` tab snapshot and supporting sections for light-only backgrounds, borders, and badge colours that break in dark mode.
- [x] **Step 2:** Replace those theme mismatches in `src/components/batches/QueenRearingPlanningTab.tsx` with dark-aware surfaces and accent treatments that remain legible and visually consistent.
- [x] **Step 3:** Update the relevant Queen Rearing documentation in `docs/features/` to note the dark-mode alignment of the planner snapshot.
- [x] **Step 4:** Mirror the approved checklist into `tasks/todo-codex.md`, mark items off as they are completed, append the review summary, and then prompt the user to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** Several planner sub-components still used light-biased nested surfaces and accent badges, so dark mode ended up feeling only partially themed.
* **Summary of Changes:** Replaced the remaining white-biased nested snapshot surfaces with the application surface palette, aligned the control panel and guidance cards to the same dark treatment, and updated the Queen Rearing docs to reflect the dark-mode pass.
* **Notes for User:** No database MCP work was required. I did not run build tests, per repo instruction; please verify the planner in dark mode in your normal browser/build check.

## Review
* **Root Cause:** The `Planning` tab had drifted into a mixed theme state. The overall layout supported dark mode, but several nested panels and supporting surfaces still relied on light-biased white overlays or a different dark treatment from the rest of the app.
* **Changes Made:** Introduced shared surface classes for the snapshot panel internals, swapped the remaining white-overlay date panels and chips to the app’s `surface` palette, aligned the right-hand control panel input treatment with the rest of the dashboard, and brought the lower guidance cards onto the same dark-mode surface hierarchy. The planner behaviour and timing logic were left unchanged.
* **Testing Needed:** Please open `/dashboard/batches`, switch to the `Planning` tab, toggle dark mode, and confirm the full tab now reads consistently rather than only parts of the snapshot.
