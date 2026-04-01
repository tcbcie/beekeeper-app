# Task: Queen Tracker Tagged Badge Layout
**Date:** 01/04/2026
**Status:** Completed

## 1. Objective
Rework the Queen Tracker header so queens with recorded tags keep the cell label as the main title and show the queen tag as a separate badge alongside the marking badge.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/QueenTrackerTab.tsx`
  * `docs/features/queen-tracker.md`
  * `docs/features/queen-tracker-tagged-badge-layout-plan.md`
  * `tasks/todo-codex.md`
  * `tasks/todo-codex-codex.md`
* **Simplicity Check:** Keep the change local to the tracker's derived display fields and header/detail rendering. Reuse the existing `queen_number` and `cell_number` data instead of changing tracker data flow or schema.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Update `QueenTrackerTab.tsx` so the main heading stays on the cell label even when a queen tag exists.
- [x] **Step 2:** Add a separate `Queen Tagged` badge after the `Marked (Colour)` badge, using wording such as `Queen Tagged 33`, and update the detail label from `Queen label` to `Queen Tagged` where appropriate.
- [x] **Step 3:** Update documentation in `docs/features/queen-tracker.md`
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The tracker was using `queen_number` as the primary title when present, which collapsed the distinction between the original cell identity and the later queen tag.
* **Summary of Changes:** Kept `Cell #...` as the main heading, moved recorded queen numbers into a separate `Queen Tagged` badge beside the marking badge, and updated the detail terminology to match.
* **Notes for User:** No database or lifecycle logic changed. Build tests were not run per repository instruction. Please verify the Queen Tracker card headers in your normal build flow.

## Review
* **Scope Covered:** Queen Tracker tagged badge layout and terminology.
* **Summary of Changes:** Numbered queens now keep the cell title in the main heading and show their recorded tag in a separate `Queen Tagged` badge instead of replacing the title.
* **Notes for User:** Please check both tagged and untagged queens, including the spacing of the badge row on narrower widths.
