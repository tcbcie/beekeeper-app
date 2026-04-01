# Feature: Queen Ledger Audit Hardening Remediation
**Date:** 01/04/2026
**Status:** Implemented

## 1. Overview
This remediation hardens the Queen Ledger against avoidable state loss and concurrent-edit drift. The goal is to preserve row context during updates, prevent failure-date and failure-comment edits from recreating stale outcomes, and simplify the filter state model so it remains deterministic under refresh and latency.

## 2. Scope & Simplicity
* **In Scope:** Local row patching after successful mutations, state-safe failure field updates, derived filter validity, narrower ledger query payloads, and local-date parsing alignment.
* **Out of Scope:** Schema changes, NIHBS logic changes, layout redesign, permission model changes, or new ledger features.
* **Existing Code Impact:** The work is limited to the ledger hook, the ledger table component, and the main tracker feature note.

## 3. Technical Design
### Architecture
The ledger keeps its existing hook-and-table shape, but successful outcome mutations now patch local row state inside the hook instead of forcing a full reload. The table component consumes that patched state directly, while filter selections are normalised through memoised derived values rather than repaired after render by effects.

### Database Connections (MCP Server)
No schema change is planned. The database interaction remains direct through Supabase queries in the existing hook. The main query will be tightened to fetch only the fields the ledger actually uses, and the failure-date and failure-comment writes will become dedicated updates guarded by explicit failure-state predicates.

## 4. Edge Cases & Risks
* Concurrent edits can currently let date or comment saves recreate a failed state after another session clears it.
* Full-ledger refetching after every row edit can drop row selection and expansion state under latency.
* Effect-driven filter repair can clear user selections after unrelated data refreshes.
* Broad `select('*')` payloads increase coupling and make the ledger more fragile when unrelated columns change.
* Raw `Date` parsing for year filters is weaker than the existing local-date helper already used elsewhere in the hook.

## 5. Implementation Phases
1. Phase 1: Refactor the hook mutation layer so row updates return precise patches and specialised failure-field updates.
2. Phase 2: Rework the table component to apply local row patches and replace effect-repaired filter state with derived selections.
3. Phase 3: Tighten the query payload, align date parsing, and update the tracker documentation.

## 6. Implementation Notes
The ledger hook now patches successful outcome writes directly into local row state instead of refetching the full ledger after each edit. Failure-date and failure-comment persistence now use dedicated updates guarded by `queen_failed = true`, and the group, member, and batch filters now rely on safe derived selections instead of repair effects after render.
