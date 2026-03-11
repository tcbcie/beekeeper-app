# Task: Queen Rearing Planning Desktop Snapshot Overlap Refinement
**Date:** 11/03/2026
**Status:** Awaiting Approval

## 1. Objective
Refine the Queen Rearing `Planning` snapshot layout so the desktop presentation no longer allows the window cards and support strip to overlap or crowd their date content.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/QueenRearingPlanningTab.tsx`
  * `docs/features/queen-rearing.md`
  * `docs/features/queen-rearing-planning-desktop-snapshot-overlap-refinement-plan.md`
* **Simplicity Check:** Keep this limited to the top `Planning` snapshot layout and its responsive behaviour. Do not change the planner calculations, inputs, or lower milestone sections.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [ ] **Step 1:** Rework the desktop structure of the snapshot window cards and drone strip so long date values and weekday badges cannot occupy conflicting horizontal space.
- [ ] **Step 2:** Simplify the internal alignment and responsive breakpoints so the snapshot remains stable on both mobile and intermediate desktop widths.
- [ ] **Step 3:** Update the relevant Queen Rearing documentation in `docs/features/` to reflect the refined desktop snapshot layout.
- [ ] **Step 4:** Mirror the approved checklist into `tasks/todo-codex.md`, mark items off as they are completed, append the review summary, and then prompt the user to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The refreshed snapshot improved the hierarchy, but several desktop-only rows still depend on side-by-side content that can exceed the available card width.
* **Summary of Changes:** Pending approval.
* **Notes for User:** No database MCP work is expected. I will not run build tests; I will ask you to verify the desktop UI once the refinement is ready.
