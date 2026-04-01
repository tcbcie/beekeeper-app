# Feature: Queen Ledger Column Reordering
**Date:** 01/04/2026
**Status:** Implemented

## 1. Overview
This change improves the scan pattern of the Queen Ledger table by bringing the queen identity closer to the detail control and moving the compact actions block to the right. The goal is a tighter estate view with less dead space between `Queen` and `Status`.

## 2. Scope & Simplicity
* **In Scope:** Reorder the table so `Queen` becomes the second column, move the `Actions` column to the right, and tighten the relevant cell widths so the row uses space more efficiently.
* **Out of Scope:** Changing the ledger data source, changing row actions, changing permissions, or altering expanded detail content.
* **Existing Code Impact:** The change should stay limited to `src/components/batches/QueenTrackerTab.tsx` and `docs/features/queen-tracker.md`.

## 3. Technical Design
### Architecture
The Queen Ledger remains a table-first client component. The update only changes column order and width treatment so the row reads in a more natural left-to-right sequence: details, queen, status, destination, then actions.

### Database Connections (MCP Server)
No database queries, schema changes, or MCP work are required for this change.

## 4. Edge Cases & Risks
* The reordered table must still keep the compact action block usable on narrower widths.
* Expanded row alignment must stay correct after the column order changes.
* The selected-row and read-only treatments must remain visually coherent across the new order.

## 5. Implementation Phases
1. Phase 1: Reorder the summary-row columns so queen identity sits near the left edge and actions move to the right.
2. Phase 2: Tighten the affected cell widths and update the tracker documentation.

## 6. Implementation Notes
The Queen Ledger summary row now reads left to right as `Details`, `Queen`, `Status`, `Destination`, and `Actions`. The queen, status, and destination cells were tightened slightly so the reordered table wastes less horizontal space.
