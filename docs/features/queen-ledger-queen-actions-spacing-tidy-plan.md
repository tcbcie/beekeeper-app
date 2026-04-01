# Feature: Queen Ledger Queen Actions Spacing Tidy
**Date:** 01/04/2026
**Status:** Implemented

## 1. Overview
This change tightens the horizontal relationship between the `Queen` and `Actions` columns in the Queen Ledger so the identity and outcome controls read as one cleaner working area. It also cleans up the `Distribution` column by moving the distributed date beneath the recipient classification badge. The aim is to reduce dead space without making the row feel cramped.

## 2. Scope & Simplicity
* **In Scope:** Reduce the visible gap between the `Queen` and `Actions` columns, tighten the related row widths or padding where needed, move the distributed date beneath the classification badge in the `Distribution` column, and preserve the current table order and controls.
* **Out of Scope:** Changing the data hook, changing distribution or action logic, changing permissions, or altering the expanded detail content.
* **Existing Code Impact:** The work should stay limited to `src/components/batches/QueenTrackerTab.tsx` and `docs/features/queen-tracker.md`.

## 3. Technical Design
### Architecture
The Queen Ledger remains a client-rendered table-first component. The change is a presentation-only pass that trims table-cell width, padding, and local layout spacing around the queen identity and action cells so the row scans more tightly, while also restacking the distribution micro-layout for better vertical use of space.

### Database Connections (MCP Server)
No database queries, schema changes, or MCP work are required for this change.

## 4. Edge Cases & Risks
* The tighter spacing must still leave the action toggles easy to click on narrower widths.
* The queen identity cluster must remain readable when a marked icon, tag icon, and age label are all present.
* The distributed date must remain easy to scan once it moves below the classification badge.
* The selected-row and read-only treatments must remain visually clear after the width reduction.

## 5. Implementation Phases
1. Phase 1: Reduce the horizontal footprint of the queen and action cells.
2. Phase 2: Restack the distribution micro-layout and update the tracker documentation to reflect the denser summary-row layout.

## 6. Implementation Notes
The Queen cell now uses a smaller identity footprint with tighter internal gaps, the Actions cell uses a narrower stacked toggle layout, and the Distribution cell now places the distributed date on a separate line beneath the classification badge.
