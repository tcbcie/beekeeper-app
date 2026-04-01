# Task: Queen Ledger Member Label Fix
**Date:** 01/04/2026
**Status:** Completed

## 1. Objective
Fix the Queen Ledger `Member` filter so it shows the real member names instead of duplicate `Unknown member` entries when owner profile data is available.

## 2. Impact Analysis
* **Files to Modify:** * `src/hooks/useQueenTracker.ts`
  * `docs/features/queen-tracker.md`
* **Simplicity Check:** This keeps the fix at the ledger data-mapping layer, where the owner name is built. The filter UI, ledger permissions, and reporting logic remain unchanged.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Normalise the batch owner profile join in the Queen Ledger hook before building `batch_owner_name`.
- [x] **Step 2:** Harden the owner-name derivation so it uses the available profile fields consistently and avoids false `Unknown member` fallbacks.
- [x] **Step 3:** Update documentation in `docs/features/queen-tracker.md`
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The ledger hook did not normalise the batch owner profile join before building the owner label, so valid profile data could be missed and the UI would fall back to `Unknown member`.
* **Summary of Changes:** Corrected the owner-profile join handling and kept the rest of the filter behaviour unchanged.
* **Notes for User:** The live data already contained valid names for the affected members. Build tests were not run per repository instruction.

## Review
* **Scope Covered:** Queen Ledger member label fix.
* **Summary of Changes:** The `Member` filter now receives the real batch owner names from the corrected hook mapping instead of duplicate placeholder labels.
* **Notes for User:** Please check the Queen Ledger `Member` filter in your normal build flow.
