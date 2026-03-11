# Task: Queen Rearing Planning Desktop Snapshot Overlap Refinement
**Date:** 11/03/2026
**Status:** Completed

## 1. Objective
Refine the Queen Rearing `Planning` snapshot layout so the desktop presentation no longer allows the window cards and support strip to overlap or crowd their date content.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/QueenRearingPlanningTab.tsx`
  * `docs/features/queen-rearing.md`
  * `docs/features/queen-rearing-planning-desktop-snapshot-overlap-refinement-plan.md`
* **Simplicity Check:** Keep this limited to the top `Planning` snapshot layout and its responsive behaviour. Do not change the planner calculations, inputs, or lower milestone sections.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Rework the desktop structure of the snapshot window cards and drone strip so long date values and weekday badges cannot occupy conflicting horizontal space.
- [x] **Step 2:** Simplify the internal alignment and responsive breakpoints so the snapshot remains stable on both mobile and intermediate desktop widths.
- [x] **Step 3:** Update the relevant Queen Rearing documentation in `docs/features/` to reflect the refined desktop snapshot layout.
- [x] **Step 4:** Mirror the approved checklist into `tasks/todo-codex.md`, mark items off as they are completed, append the review summary, and then prompt the user to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The refreshed snapshot improved the hierarchy, but several desktop-only rows still depended on side-by-side content that could exceed the available card width.
* **Summary of Changes:** Stacked the range details within each desktop window card, moved the weekend chip onto its own line, turned the drone timing strip into a safer summary block, and aligned the Queen Rearing docs with the refined snapshot layout.
* **Notes for User:** No database MCP work was required. I did not run build tests, per repo instruction; please verify the desktop planner UI in your normal browser/build check.

## Review
* **Root Cause:** The remaining overlap came from horizontal competition inside the desktop snapshot cards. Date text, weekday chips, and supporting labels were still sharing the same narrow rows even after the broader layout refresh.
* **Changes Made:** Reworked `SnapshotWindowCard` so the `From` and `Until` blocks now stack vertically inside each range panel, with the weekend chip separated from the explanatory text. Reworked `SnapshotSupportStrip` so the drone date summary sits in its own contained block rather than competing with the descriptive copy in one flex row. The surrounding planner logic and the mobile-friendly snapshot concept were left unchanged.
* **Testing Needed:** Please open `/dashboard/batches`, switch to the `Planning` tab, and confirm the snapshot now stays clean on the desktop width that previously showed overlap, while still reading well on mobile.
