# Task: Queen Ledger Hardening Remediation
**Date:** 01/04/2026
**Status:** Completed

## 1. Objective
Harden the Queen Ledger data and update flows by tightening the visibility query boundary, making the hybridisation date editor state-safe, rejecting invalid ledger rows instead of fabricating placeholder identity values, and trimming avoidable query load.

## 2. Impact Analysis
* **Files to Modify:** * `src/hooks/useQueenTracker.ts`
  * `src/components/batches/QueenTrackerTab.tsx`
  * `docs/features/queen-tracker.md`
* **Simplicity Check:** This keeps the change inside the existing ledger hook and component. No schema change, route change, NIHBS logic change, or new feature surface is required.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Refactor the ledger fetch path so it only queries rows the current user may legitimately see, and deduplicate graft IDs before the weight lookup.
- [x] **Step 2:** Reject malformed ledger rows without a valid cell number instead of falling back to fabricated `Cell #0` identity data.
- [x] **Step 3:** Rework the hybridisation date editor into a controlled, clearable flow that stays in sync with persisted state and uses the existing guarded mutation path safely.
- [x] **Step 4:** Update documentation in `docs/features/queen-tracker.md`
- [x] **Step 5:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The ledger was still overfetching then trimming visibility client-side, malformed rows could degrade into fabricated `Cell #0` identities, and the hybridisation date input could drift away from persisted state after a failed write or a cleared value.
* **Summary of Changes:** Tightened the fetch boundary to owned rows plus owned-group rows, deduplicated the weight lookup, skipped malformed rows without a valid cell number, and converted the hybridisation date editor into a controlled, clearable flow that reverts on failed saves.
* **Notes for User:** No schema or NIHBS logic changed. Build tests were not run per repository instruction.
