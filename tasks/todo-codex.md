# Task: Queen Rearing Planning Snapshot Overlap Regression Fix
**Date:** 11/03/2026
**Status:** Completed

## 1. Objective
Fix the planner snapshot regression where the `From` and `Until` date blocks overlap again at intermediate desktop widths.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/QueenRearingPlanningTab.tsx`
  * `docs/features/queen-rearing.md`
  * `docs/features/queen-rearing-planning-snapshot-overlap-regression-fix-plan.md`
* **Simplicity Check:** Kept this limited to the responsive layout behaviour of the snapshot date blocks. The planner logic, tone system, and broader dark-mode direction were left intact.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Audit the snapshot card breakpoints and identify the exact width conditions where the `From` and `Until` date blocks no longer have enough space.
- [x] **Step 2:** Adjust the responsive layout in `src/components/batches/QueenRearingPlanningTab.tsx` so the date blocks only sit side by side when there is enough width and otherwise stack cleanly without overlap.
- [x] **Step 3:** Update the relevant Queen Rearing documentation in `docs/features/` to note the overlap regression fix.
- [x] **Step 4:** Mirror the approved checklist into `tasks/todo-codex.md`, mark items off as they are completed, append the review summary, and then prompt the user to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The snapshot window cards were switching to a two-column inner date layout based on viewport size instead of the actual card width, while the date strings remained unbreakable.
* **Summary of Changes:** Replaced the fixed `sm:grid-cols-2` inner layout with an auto-fit grid, allowed the date block headers to wrap, and slightly reduced the minimum date text size so the cards stack before overlap begins.
* **Notes for User:** No database MCP work was required. I did not run build tests, per repo instruction; please verify the planner snapshot in your normal browser/build check.

## Review
* **Root Cause:** The regression came from a breakpoint assumption. Once the top shell was redesigned, the window cards became narrower at some desktop widths, but the inner `From` and `Until` blocks still switched to two columns too early.
* **Changes Made:** Changed the inner snapshot date layout to an auto-fit grid driven by card width, added wrapping behaviour to the small header rows, and eased the date text sizing slightly so the cards preserve readability without colliding.
* **Testing Needed:** Please open `/dashboard/batches`, switch to `Planning`, and check the snapshot on the desktop width that was previously overlapping.
