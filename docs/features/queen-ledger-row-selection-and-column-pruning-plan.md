# Feature: Queen Ledger Row Selection And Column Pruning
**Date:** 01/04/2026
**Status:** Implemented

## 1. Overview
The Queen Ledger table is now much denser, but it still carries summary columns that repeat information already covered by filters, and there is no explicit selected-row state when the user is scanning a larger estate. This pass will add a clear selected-row treatment, simplify the visible table columns, remove stage data from the Queen Ledger UI, and move the remaining context into the expanded row details.

## 2. Scope & Simplicity
* **In Scope:** Add selected-row highlighting, remove `Group`, `Member`, `Batch`, and the combined `Weight and stage` summary column from the main table, remove stage data from the Queen Ledger UI, and move the removed context into expanded details.
* **Out of Scope:** Changing ledger data retrieval, altering row actions, modifying filter logic, or changing NIHBS behaviour.
* **Existing Code Impact:** The work stays primarily within `src/components/batches/QueenTrackerTab.tsx` plus the related feature note.

## 3. Technical Design
### Architecture
The Queen Ledger remains a table-first client-rendered view backed by `useQueenTracker`. This pass only changes how the summary table is composed and how the currently focused row is visually identified. The expanded detail row remains the place for fuller context and now absorbs the removed group, member, and batch fields, while stage data is removed from the ledger UI entirely.

### Database Connections (MCP Server)
No database or MCP change is required. The existing row data already contains the group, member, batch, stage, and destination context needed for the revised presentation.

## 4. Edge Cases & Risks
* Selected-row styling must remain clear even when the row is also expanded.
* Removing columns must not hide critical operational context that still needs to be visible without expansion.
* The expanded detail area must surface the moved fields clearly enough that users do not lose orientation after the summary columns are removed.
* Removing stage data must not leave any dangling labels or stale wording in the row or detail panels.

## 5. Implementation Phases
1. Phase 1: Add selected-row highlighting and streamline the summary table columns.
2. Phase 2: Move the removed context into the expanded details, remove stage data from the ledger UI, and update the feature note to match the new scanning model.
