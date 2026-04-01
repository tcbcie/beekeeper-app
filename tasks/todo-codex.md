# Task: Queen Tracker Tagged Format And Tab Key
**Date:** 01/04/2026
**Status:** Completed

## 1. Objective
Update tagged queens to use the format `Queen Tagged (#xx)` and rename the batches-page tab query key from `virgins` to `queens`.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/QueenTrackerTab.tsx`
  * `src/app/dashboard/batches/page.tsx`
  * `docs/features/queen-tracker.md`
  * `docs/features/queen-tracker-tagged-format-and-tab-key-plan.md`
  * `tasks/todo-codex.md`
  * `tasks/todo-codex-codex.md`
* **Simplicity Check:** Keep the change limited to tracker presentation and the batches tab key handling. Reuse existing `queen_number` and current tab-state code, and preserve true biological or database uses of `virgin_queen`.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Update the tracker badge text so tagged queens show `Queen Tagged (#xx)` and keep the existing cell title layout.
- [x] **Step 2:** Rename the batches page tab key from `virgins` to `queens`, including the active-tab checks and tab config.
- [x] **Step 3:** Remove the old `virgins` query key handling so the page uses only `queens` for the Queen Tracker tab.
- [x] **Step 4:** Update documentation in the Queen Tracker feature note.
- [x] **Step 5:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The tracker badge format and the batches-page tab query key were still carrying older naming, which left the UI wording and URL parameter out of line with the current `Queen Tracker` language.
* **Summary of Changes:** Updated tagged queens to render as `Queen Tagged (#xx)`, renamed the batches-page tab key from `virgins` to `queens`, and removed the old tab-key handling while leaving true lifecycle terms untouched.
* **Notes for User:** No database or lifecycle logic changed. Build tests were not run per repository instruction. Please verify the Queen Tracker tab URL and header badges in your normal build flow.

## Review
* **Scope Covered:** Queen Tracker tagged format and tab key naming.
* **Summary of Changes:** The tracker now uses the requested `Queen Tagged (#xx)` format, and the batches page now opens the Queen Tracker under `?tab=queens`.
* **Notes for User:** Please check direct navigation to the Queen Tracker tab and confirm the badge text on tagged queens.
