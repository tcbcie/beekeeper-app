# Feature: Queen Ledger Hardening Remediation
**Date:** 01/04/2026
**Status:** Implemented

## 1. Overview
This pass hardens the Queen Ledger against silent data corruption and state drift. It narrows the fetch path to the intended visibility rules, removes fabricated fallback identity values for malformed rows, makes the hybridisation date editor resilient to failed writes and cleared values, and reduces avoidable weight-query overhead.

## 2. Scope & Simplicity
* **In Scope:** Tighten the Queen Ledger fetch boundary, deduplicate graft IDs before the weight lookup, skip malformed rows without a valid cell number, and make hybridisation date editing controlled and clearable.
* **Out of Scope:** Database schema changes, RLS changes, NIHBS reporting changes, filter redesign, or broader Queen Ledger layout changes.
* **Existing Code Impact:** The work stays within `src/hooks/useQueenTracker.ts`, `src/components/batches/QueenTrackerTab.tsx`, and the related feature note.

## 3. Technical Design
### Architecture
The Queen Ledger remains a client-rendered view backed by `useQueenTracker`. The remediation moves visibility enforcement closer to the query layer by splitting owned-row fetches from owned-group visibility fetches, then keeps the component focused on rendering and guarded mutation handling. The expanded row continues to own the hybridisation date editor, but that editor is now controlled so the UI cannot drift from persisted state after failed writes or cleared values.

### Database Connections (MCP Server)
No schema or migration change is required. The existing Supabase queries over `graft_distributions`, `rearing_groups`, `rearing_group_members`, `batch_grafts`, `queen_weights`, and related joins remain in place, but the ledger hook will:
- fetch the current user's own ledger rows directly from `graft_distributions.user_id`
- fetch additional visible group rows only for groups owned by the current user
- deduplicate graft IDs before querying `queen_weights`
- skip malformed ledger rows that do not have a valid `batch_grafts.cell_number`
- continue using existing update calls for `graft_distributions`

## 4. Edge Cases & Risks
* Controlled date input state must stay synchronised when rows refresh after a successful mutation.
* Skipping malformed rows must fail safely without collapsing the rest of the ledger load.
* Query narrowing must preserve the current owner-versus-member visibility model exactly.
* Clearing a hybridisation date must not leave a stale local input value behind after the next refresh.

## 5. Implementation Phases
1. Phase 1: Harden the ledger fetch path and malformed-row handling in `useQueenTracker`.
2. Phase 2: Harden the hybridisation date editor flow in `QueenTrackerTab` and update the tracker note.
