# Task: Queen Tracker Marking Status Fix
**Date:** 01/04/2026
**Status:** Completed

## 1. Objective
Correct the Queen Tracker marking summary so it only shows a marking colour when the queen is actually marked, and update the wording to the proper `Marked (Colour)` terminology.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/QueenTrackerTab.tsx`
  * `docs/features/queen-tracker.md`
  * `docs/features/queen-tracker-marking-status-plan.md`
  * `tasks/todo-codex.md`
  * `tasks/todo-codex-codex.md`
* **Simplicity Check:** Keep the fix local to the Queen Tracker's derived-row mapping and header/detail rendering. Reuse the existing `queen_marked` field instead of introducing new state, data sources, or schema changes.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Update `QueenTrackerTab.tsx` so marking colour is only derived and shown when `queen_marked` is true.
- [x] **Step 2:** Change the header summary wording from `Marking White` style text to `Marked (White)` for marked queens and a correct unmarked fallback for the rest.
- [x] **Step 3:** Update documentation in `docs/features/queen-tracker.md`
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The Queen Tracker was deriving a year colour from `emergence_date` for every row and presenting it as if it were a recorded marking event, even when `queen_marked` was false.
* **Summary of Changes:** Gated marking colour behind `queen_marked`, updated the header and detail terminology to `Marked (Colour)` or `Unmarked`, and restricted the colour dot to genuinely marked queens.
* **Notes for User:** No database or lifecycle logic changed. Build tests were not run per repository instruction. Please verify the Queen Tracker cards in your normal build flow.

## Review
* **Scope Covered:** Queen Tracker marking status display and terminology.
* **Summary of Changes:** The tracker now only shows marking colour for genuinely marked queens, uses `Marked (Colour)` wording, and keeps unmarked queens clearly labelled as `Unmarked`.
* **Notes for User:** Please check a mix of marked and unmarked queens, especially cells 9, 10, 13, and 14 versus unmarked cells.
