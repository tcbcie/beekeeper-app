# Feature: Queen Ledger Failure Outcome
**Date:** 01/04/2026
**Status:** Implemented

## 1. Overview
This change adds an explicit queen-failure outcome to the Queen Ledger. Users will be able to trigger failure from the existing row action area, while the failure date and a short comment will be recorded in the expanded outcomes section. The key goal is to stop treating `overwintered = false` as if it were the same thing as a queen failure.

## 2. Scope & Simplicity
* **In Scope:** Add an explicit failure outcome, add a compact failure trigger in the `Actions` column, capture failure date and short comment in the expanded `Outcomes` panel, and update ledger status or summary logic so `Failed` reflects the new explicit state.
* **Out of Scope:** Building a separate failure workflow outside the Queen Ledger, changing distribution creation, or altering the non-group NIHBS boundary.
* **Existing Code Impact:** The work should stay focused on `src/hooks/useQueenTracker.ts`, `src/components/batches/QueenTrackerTab.tsx`, and the tracker documentation, plus a migration on `public.graft_distributions`.

## 3. Technical Design
### Architecture
The Queen Ledger remains the single place where post-distribution outcomes are managed. The row-level `Actions` column will gain a third failure trigger under the existing overwintered and hybridised controls. Once triggered, the expanded `Outcomes` panel will hold the richer failure inputs so the main table stays compact.

Failure should become an explicit ledger outcome rather than a derived alias of `overwintered === false`. The UI status and filter logic should therefore pivot to the explicit failure state first, before any overwintering interpretation.

### Database Connections (MCP Server)
The local code path does not show explicit failure fields on `graft_distributions`, so this feature is expected to require a database migration for dedicated failure storage such as:
- failure flag
- failure date
- failure comment

Live MCP verification now confirms that `public.graft_distributions` currently stops at:
- `overwintered`
- `overwintered_date`
- `offspring_hybridised`
- `hybridisation_date`

There are no dedicated queen-failure columns yet, so the migration is required for an explicit failure outcome.

## 4. Edge Cases & Risks
* Failure must not remain semantically tied to `overwintered = false`, or the new mechanism will continue to blur two different outcomes.
* The failure trigger must remain visible in the compact row without forcing date and comment inputs back into the table.
* Failure comment capture should stay deliberately short so the ledger does not become a free-form notes system.
* Existing `Failed` filters and summary counts must move to the explicit failure state or they will continue reporting the wrong meaning.

## 5. Implementation Phases
1. Phase 1: Add an explicit failure outcome model and update the hook or status logic.
2. Phase 2: Add the row trigger plus expanded failure date or comment capture, then update the tracker documentation.

## 6. Implementation Notes
The live MCP schema check confirmed that `public.graft_distributions` had no dedicated failure fields, so the implementation added `queen_failed`, `queen_failed_date`, and `queen_failure_comment` through a migration. Historic rows where the tracker had previously treated `overwintered = false` as failed were backfilled into the new explicit failure state so the ledger retained its existing failure meaning. The Queen Ledger now exposes a compact `Failed` action in the row and edits failure date or comment in the expanded `Outcomes` panel.
