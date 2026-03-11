# Task: Queen Rearing Planning Summary Card Readability
**Date:** 11/03/2026
**Status:** Completed

## 1. Objective
Improve the readability of the Queen Rearing `Planning` tab summary cards so single dates and planning ranges are easier to scan, especially where weekday labels currently wrap awkwardly.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/QueenRearingPlanningTab.tsx`
  * `docs/features/queen-rearing.md`
  * `docs/features/queen-rearing-planning-summary-card-readability-plan.md`
* **Simplicity Check:** Keep the change limited to the presentation of the top planning summary cards. Leave the planner calculations, state flow, and downstream milestone logic untouched.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Refactor the top summary-card rendering in `src/components/batches/QueenRearingPlanningTab.tsx` so dates and weekdays are presented as structured lines instead of one wrapped text string.
- [x] **Step 2:** Tighten the card layout, spacing, and responsive behaviour so date ranges remain readable across the current card grid.
- [x] **Step 3:** Update the relevant Queen Rearing documentation in `docs/features/` to describe the improved planner summary presentation.
- [x] **Step 4:** Mirror the approved checklist into `tasks/todo-codex.md`, mark items off as they are completed, append the review summary, and then prompt the user to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The summary cards were rendering each date plus weekday as a single string, which forced awkward line breaks and made range cards difficult to scan.
* **Summary of Changes:** Reworked the top planning summary cards into structured single-date and range blocks, eased the responsive grid so five narrow columns are only used at larger widths, and aligned the Queen Rearing documentation with the improved planner presentation.
* **Notes for User:** No database MCP work was required. I did not run build tests, per repo instruction; please verify the updated planner UI in your normal browser/build check.

## Review
* **Root Cause:** The top planner cards compressed dates and weekdays into wrapped inline strings, so the most important planning information became harder to parse as soon as the cards narrowed.
* **Changes Made:** Added small presentational helpers in `QueenRearingPlanningTab` for single-date and range summaries, split the date and weekday into deliberate visual rows, and updated the summary grid so it stays at two or three columns until very wide screens. This keeps the planner logic unchanged while making the cards easier to read.
* **Testing Needed:** Please open `/dashboard/batches`, switch to the `Planning` tab, and check that the top summary cards now read cleanly on both desktop and narrower window widths.
