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
* **Simplicity Check:** This keeps the remediation inside the existing ledger hook and table component. The plan avoids schema changes, avoids broad UI redesign, and focuses only on removing fragile state transitions and over-broad data handling.

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
* **Root Cause Found (if applicable):** The ledger was still refetching and rebuilding the full row set after each outcome edit, and the failure detail editors were updating state in ways that could reintroduce stale outcomes after concurrent changes. The filter hierarchy also depended on repair effects instead of deterministic derived state.
* **Summary of Changes:** Added local row patching for outcome writes, split failure-date and failure-comment persistence into guarded updates, replaced filter repair effects with safe derived selections, narrowed the hook query payload, and aligned year parsing with the local-date helper.
* **Notes for User:** No database migration was required for this remediation. Build tests were not run per repository instruction.
