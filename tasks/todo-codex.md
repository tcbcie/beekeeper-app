# Task: Queen Rearing Planning Timeline Tab
**Date:** 11/03/2026
**Status:** Completed

## 1. Objective
Add a new `Planning` tab to the Queen Rearing section, positioned after `Virgin Queen Tracker`, so the user can explore different graft dates and immediately see the linked queen and drone timing windows, including weekdays for emergence, mating, laying, and drone readiness.

## 2. Impact Analysis
* **Files to Modify:** * `src/app/dashboard/batches/page.tsx`
  * `src/components/batches/QueenRearingPlanningTab.tsx`
  * `docs/features/queen-rearing.md`
  * `docs/features/overview-pages-improvement.md`
  * `docs/features/queen-rearing-planning-timeline-tab-plan.md`
* **Simplicity Check:** Keep this as a client-side planning sandbox with local state only. No database schema changes, no saved planner records, and no changes to existing batch data entry beyond the tab navigation needed to host the new tab.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Refactor the Queen Rearing tab state in `src/app/dashboard/batches/page.tsx` so the current `Grafting Batch` tab has a distinct internal key, then add a new user-facing `Planning` tab after `Virgin Queen Tracker` without changing the existing batch workflow.
- [x] **Step 2:** Build `src/components/batches/QueenRearingPlanningTab.tsx` as a local planning tool driven by a graft date input, showing the derived queen milestones: graft date, virgin emergence, mating-flight window, likely laying window, and clearly labelled weekdays.
- [x] **Step 3:** Extend the same planning view to show linked drone timing from the planned queen schedule, including the recommended drone-rearing start point, drone emergence, and when drones should be mature enough to mate.
- [x] **Step 4:** Update the relevant Queen Rearing documentation in `docs/features/` so the tab list, purpose, and planning behaviour are recorded for future maintenance.
- [x] **Step 5:** Mirror the approved checklist into `tasks/todo-codex.md`, mark items off as they are completed, append the review summary, and then prompt the user to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The Queen Rearing page currently supports live batch tracking but has no forward-planning workspace for comparing graft dates against queen and drone development windows.
* **Summary of Changes:** Added a fifth `Planning` tab to the Queen Rearing page, introduced a local graft-date planning view for queen and drone timing, and aligned the supporting feature documentation with the new tab structure and timeline assumptions.
* **Notes for User:** No database MCP work was required. I did not run build tests, per repo instruction; please verify the new planner tab in your normal UI/build check.

## Review
* **Root Cause:** The Queen Rearing page could track live batches, mating nucs, selection, and distributed virgins, but it had no forward-planning workspace for testing graft dates against queen and drone timing windows.
* **Changes Made:** Renamed the existing internal tab key from `planning` to `grafting` so a new user-facing `Planning` tab could be added cleanly. Added `QueenRearingPlanningTab` as a local sandbox on `/dashboard/batches` with a graft date picker, quick date nudges, weekday-aware queen milestones, and backward-planned drone timing. Updated the Queen Rearing documentation and overview notes to reflect the new five-tab layout and the planner's explicit timing assumptions.
* **Testing Needed:** Please open `/dashboard/batches`, switch to the new `Planning` tab, try several graft dates, and confirm the queen and drone timelines move as expected while the `Grafting Batch` tab still behaves exactly as before.
