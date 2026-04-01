# Task: Queen Ledger Row Tidy Pass
**Date:** 01/04/2026
**Status:** Completed

## 1. Objective
Tighten the Queen Ledger table so the main queen row reads more cleanly by removing the legend block, simplifying marking and tagging cues, removing duplicated marked or unmarked wording, and making age display clearer.

## 2. Impact Analysis
* **Files to Modify:** * `src/components/batches/QueenTrackerTab.tsx`
  * `docs/features/queen-tracker.md`
* **Simplicity Check:** This keeps the change inside the Queen Ledger presentation layer only. The hook, filters, permissions, and outcome logic remain unchanged.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Remove the `Ledger legend` section so the table starts closer to the actual data.
- [x] **Step 2:** Refine the queen row identity block to use compact visual indicators for marked and tagged queens, while still showing the tagged number when present.
- [x] **Step 3:** Remove duplicated marked or unmarked wording from the queen row and prefix age explicitly as `Age ...` in the row summary.
- [x] **Step 4:** Update documentation in `docs/features/queen-tracker.md`
- [x] **Step 5:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The table still carried leftover card-era presentation cues, which made the queen row noisier than it needed to be and repeated marking language unnecessarily.
* **Summary of Changes:** Removed the legend, simplified the marked and tagged presentation, and cleaned the summary line so age is explicit without duplicating marked or unmarked text.
* **Notes for User:** This is a presentation-only change. Build tests were not run per repository instruction.

## Review
* **Scope Covered:** Queen Ledger row tidy pass.
* **Summary of Changes:** The Queen Ledger row now uses compact state indicators and a clearer age label, which makes the summary row feel tidier and easier to scan.
* **Notes for User:** Please check the Queen Ledger row presentation in your normal build flow.
