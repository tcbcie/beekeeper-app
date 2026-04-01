# Feature: Queen Ledger Outcome Column Compaction
**Date:** 01/04/2026
**Status:** Implemented

## 1. Overview
This change tightens the Queen Ledger table so the outcome controls stop dominating the row width. The main table will keep quick overwintered and hybridised toggles for fast scanning and editing, but they will be stacked inside one compact action area. The editable outcome dates will move into the expanded details where they can still be recorded without bloating the ledger row.

## 2. Scope & Simplicity
* **In Scope:** Replace the separate `Overwintered` and `Hybridised` columns with one compact stacked action area, keep the toggles directly accessible in the table, move editable date inputs into the expanded details, and tighten the surrounding row layout so the ledger remains easier to scan across larger estates.
* **Out of Scope:** Changing the Queen Ledger data hook, changing permissions, changing NIHBS reporting, or altering the underlying outcome persistence rules.
* **Existing Code Impact:** The work should stay limited to `src/components/batches/QueenTrackerTab.tsx` and the tracker documentation in `docs/features/queen-tracker.md`.

## 3. Technical Design
### Architecture
The Queen Ledger remains a table-first client component. The main-row outcome area will become one compact stacked control block containing both toggles, while the expanded row will absorb the editable date controls for overwintering and hybridisation inside the existing outcomes panel.

### Database Connections (MCP Server)
No database queries, schema changes, or MCP work are required for this change. The existing outcome handlers and persisted fields remain unchanged.

## 4. Edge Cases & Risks
* Date entry must remain available for editable rows after it is removed from the table cells.
* Read-only rows must continue to show outcome state clearly without exposing writable inputs.
* The compact action layout must still work on narrower widths without creating cramped tap targets.

## 5. Implementation Phases
1. Phase 1: Replace the two separate outcome columns with one compact stacked action area so the table scans more cleanly.
2. Phase 2: Move editable outcome date inputs into the expanded details and update the tracker documentation.

## 6. Implementation Notes
The Queen Ledger main row now uses one `Actions` column with vertically stacked `Overwintered` and `Hybridised` toggles. Editable outcome dates were removed from the table row and relocated into the expanded Outcomes panel, where they remain available for distributing members without consuming table width.
