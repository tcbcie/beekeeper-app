# Task: Queen Ledger Filter Hierarchy
**Date:** 01/04/2026
**Status:** Completed

## 1. Objective
Add dynamic Queen Ledger filters for Group -> Member -> Batch, include non-group batches in the same tracking flow, and keep non-group batches out of NIHBS reporting.

## 2. Impact Analysis
* **Files to Modify:** * `useQueenTracker.ts`
  * `QueenTrackerTab.tsx`
  * `useNIHBSReport.ts`
  * `queen-tracker.md`
  * `queen-ledger-filter-hierarchy-plan.md`
  * `todo-codex.md`
  * `todo-codex-codex.md`
* **Simplicity Check:** Keep the change inside the existing ledger hook and ledger tab. Reuse the visible ledger rows to derive the cascading filters, and keep the existing group-only NIHBS query boundary intact.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Broaden the ledger data load so it includes both visible group-linked distributions and the current user’s non-group batches, with explicit metadata for group scope, member ownership, and batch identity.
- [x] **Step 2:** Add derived filter helpers for group scope, member, and batch so the hierarchy resets cleanly when an upstream choice changes.
- [x] **Step 3:** Rework the Queen Ledger filter bar so owners can drill down Group -> Member -> Batch, while ordinary members only see the member choices they are allowed to act on.
- [x] **Step 4:** Make non-group batches selectable and trackable in the ledger without broadening NIHBS calculations beyond group-linked batches.
- [x] **Step 5:** Update documentation in the Queen Tracker feature note and close the task log.
- [x] **Step 6:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The ledger query was hard-filtered to group-linked batches, and the UI only exposed a flat group filter, so users could not drill down by member or batch and could not see non-group ledger rows at all.
* **Summary of Changes:** Broadened the ledger data source to include the current user’s non-group batches, added derived `Group -> Member -> Batch` filters, reset downstream filter state defensively, and made the NIHBS group-only boundary explicit in the reporting hook and feature note.
* **Notes for User:** Live MCP checks confirmed that `rearing_group_id` is nullable, non-group batches already exist, and the NIHBS report path already excludes them by requiring the selected group ID. Build tests were not run per repository instruction.

## Review
* **Scope Covered:** Queen Ledger filter hierarchy and non-group ledger visibility.
* **Summary of Changes:** The ledger now supports cascading group, member, and batch filters, includes non-group batches for the current user, and continues to leave non-group batches out of NIHBS reporting.
* **Notes for User:** Please verify owner and member views, plus non-group ledger rows, in your normal build flow.
