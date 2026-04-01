# Task: Queen Ledger Outcome Date Capture Flow
**Date:** 01/04/2026
**Status:** Completed

## 1. Objective
Fix the Queen Ledger row-action flow so outcome actions capture the date as part of the action itself instead of silently applying a default date and expecting the user to expand the row afterwards.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/QueenTrackerTab.tsx`
  * `src/hooks/useQueenTracker.ts`
  * `docs/features/queen-ledger-outcome-date-capture-flow-plan.md`
  * `docs/features/queen-tracker.md`
* **Simplicity Check:** This keeps the current ledger data model and the existing expanded detail editors, but replaces the current blind-toggle interaction with a compact inline action editor that requires date capture before saving date-bearing outcomes.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Replace the current immediate row-action toggles with a tighter action flow that asks for the date before the outcome write is committed.
- [x] **Step 2:** Keep the table free of visible date fields while leaving the recorded dates editable in the expanded details area.
- [x] **Step 3:** Apply the improved action flow consistently across the date-bearing ledger outcomes so the interaction is predictable.
- [x] **Step 4:** Update documentation in `docs/features/queen-tracker.md`
- [x] **Step 5:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The ledger action column was writing outcomes immediately with a hidden default date, then relying on a separate expanded-detail edit for correction. That made the first save too implicit and too easy to leave wrong.
* **Summary of Changes:** Replaced the blind-toggle pattern with a compact inline action editor that requires the user to confirm the date before a date-bearing outcome is saved, while keeping the recorded dates out of the main table row and editable in the expanded details.
* **Notes for User:** No schema change was needed. Build tests were not run per repository instruction.

## Review
* **Scope Covered:** Queen Ledger outcome date capture flow.
* **Summary of Changes:** The row actions now open a compact editor inside the actions cell, require the date before saving `Mated`, `Overwintered`, `Hybridised`, or `Failed` outcomes, and leave later date edits in the expanded details where they already belong.
* **Notes for User:** Please check the action flow carefully in the ledger, especially marking an outcome from an initially unknown state and clearing an already-recorded outcome.
