# Task: Queen Ledger Table Layout
**Date:** 01/04/2026
**Status:** Completed

## 1. Objective
Convert the Queen Ledger from stacked individual cards into a denser table layout so larger queen lists are easier to scan, while keeping key actions directly accessible and moving the fuller detail set into expandable rows.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/QueenTrackerTab.tsx`
  * `docs/features/queen-tracker.md`
* **Simplicity Check:** This keeps the change in the Queen Ledger presentation layer only. The ledger hook, filtering logic, permissions, and NIHBS boundary remain unchanged.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Replace the current card-per-queen list with a responsive ledger table that surfaces the most important scanning columns in the main row.
- [x] **Step 2:** Keep overwintering and hybridisation actions directly accessible in the main row, while moving the broader queen, breeding, and destination context into an expandable detail row.
- [x] **Step 3:** Rework the existing legend so it fits the new table model and still explains statuses, badges, and inline actions clearly.
- [x] **Step 4:** Update documentation in `docs/features/queen-tracker.md`
- [x] **Step 5:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The card layout hid too much of the ledger shape once row counts increased, which made scanning group, member, batch, and outcome state unnecessarily slow.
* **Summary of Changes:** Converted the ledger to a table-first layout, kept key outcome controls inline, and preserved the fuller record through expandable detail rows.
* **Notes for User:** This is a presentation-only change. Build tests were not run per repository instruction.

## Review
* **Scope Covered:** Queen Ledger table layout conversion.
* **Summary of Changes:** The ledger now presents queens as compact summary rows with direct actions and expandable detail, which makes larger estates easier to read without changing the underlying logic.
* **Notes for User:** Please check the Queen Ledger table in your normal build flow, especially row expansion, inline actions, and horizontal overflow behaviour.
