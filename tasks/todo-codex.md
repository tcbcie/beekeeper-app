# Task: Queen Ledger Member Label Fix
**Date:** 01/04/2026
**Status:** Completed

## 1. Objective
Fix the Queen Ledger `Member` filter so it shows the real member names instead of duplicate `Unknown member` entries when owner profile data is available.

## 2. Impact Analysis
* **Files to Modify:** * `useQueenTracker.ts`
  * `queen-tracker.md`
  * `queen-ledger-member-label-fix-plan.md`
  * `todo-codex.md`
  * `todo-codex-codex.md`
* **Simplicity Check:** Keep the fix at the ledger data-mapping layer, where the owner name is built. The filter UI, ledger permissions, and reporting logic remain unchanged.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Normalise the batch owner profile join in the Queen Ledger hook before building `batch_owner_name`.
- [x] **Step 2:** Harden the owner-name derivation so it uses the available profile fields consistently and avoids false `Unknown member` fallbacks.
- [x] **Step 3:** Update documentation in `docs/features/queen-tracker.md`
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The ledger hook was reading the batch owner profile join without normalising array-versus-object join shapes, so valid owner profiles could be treated as empty and collapse into the `Unknown member` fallback.
* **Summary of Changes:** Normalised the batch owner profile join before deriving `batch_owner_name`, so the `Member` filter now receives real owner labels when profile data exists.
* **Notes for User:** The live database already contained valid names for the affected group members. Build tests were not run per repository instruction.

## Review
* **Scope Covered:** Queen Ledger member label fix.
* **Summary of Changes:** The ledger now resolves batch owner names reliably from the joined profile record, which restores the actual member names in the `Member` filter instead of duplicate `Unknown member` entries.
* **Notes for User:** Please check the `Member` filter in the Queen Ledger in your normal build flow.
