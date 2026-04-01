# Task: Queen Ledger Hardening Remediation
**Date:** 01/04/2026
**Status:** Completed

## 1. Objective
Harden the Queen Ledger so row updates do not refetch and reset the full view, failure-date and comment edits cannot silently resurrect outcomes, and the filter state becomes derived rather than effect-repaired.

## 2. Impact Analysis
* **Files to Modify:** * `src/hooks/useQueenTracker.ts`
  * `src/components/batches/QueenTrackerTab.tsx`
  * `docs/features/queen-tracker.md`
  * `docs/features/queen-ledger-audit-hardening-remediation-plan.md`
* **Simplicity Check:** This keeps the remediation inside the existing ledger hook and table component. The work avoids schema changes and broad UI redesign, and focuses only on removing fragile state transitions and over-broad data handling.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Refactor the ledger outcome update path so successful row edits patch local state instead of refetching and replacing the full ledger.
- [x] **Step 2:** Split failure-date and failure-comment persistence from the main failure toggle so date or comment saves cannot recreate a failed state after concurrent changes.
- [x] **Step 3:** Replace the current effect-based group, member, and batch filter repair logic with safe derived selections.
- [x] **Step 4:** Narrow the ledger select payload and align year parsing with the existing local date helper.
- [x] **Step 5:** Update documentation in `docs/features/queen-tracker.md`
- [x] **Step 6:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The ledger was still treating every row mutation as a full data reload, and the detail editors were writing state-bearing fields in ways that could recreate stale outcomes after concurrent changes. The filter hierarchy was also maintaining validity through repair effects instead of deterministic derived state.
* **Summary of Changes:** Row outcome writes now patch the local ledger state inside the hook, failure-date and failure-comment edits use dedicated guarded updates, the Group/Member/Batch selections are normalised through derived safe values, the ledger query now selects only the fields it actually uses, and year parsing now uses the local-date helper consistently.
* **Notes for User:** No schema change was needed for this remediation. Build tests were not run per repository instruction.

## Review
* **Scope Covered:** Queen Ledger hardening remediation.
* **Summary of Changes:** The ledger no longer drops back to a full loading state after each row edit, failure-date and failure-comment writes cannot silently recreate stale failure state, the filter hierarchy is derived rather than effect-repaired, and the hook now requests a narrower payload with consistent local-date parsing.
* **Notes for User:** Please run your normal build check and review the Queen Ledger with a focus on inline outcome edits, filter stability, and retained row context after updates.
