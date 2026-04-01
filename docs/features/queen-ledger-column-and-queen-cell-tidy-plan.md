# Feature: Queen Ledger Column And Queen Cell Tidy
**Date:** 01/04/2026
**Status:** Implemented

## 1. Overview
The Queen Ledger table now has the right density, but the `Details` control sits too far from the row identity and the queen cell still wastes space between the cell label and its compact state cues. This pass tightens the table by bringing the detail control forward and making the queen identity cell read as one tighter cluster.

## 2. Scope & Simplicity
* **In Scope:** Move the `Details` column to the front of the table, tighten the queen identity cell spacing, and keep the rest of the table behaviour intact.
* **Out of Scope:** Changing table data, altering row actions, modifying filters, or changing expanded detail content.
* **Existing Code Impact:** The work stays primarily within `src/components/batches/QueenTrackerTab.tsx` plus the related feature note.

## 3. Technical Design
### Architecture
The Queen Ledger remains a table-first client-rendered view backed by `useQueenTracker`. This pass only refines the summary row composition by adjusting column order and tightening the queen identity layout within the existing row model.

### Database Connections (MCP Server)
No database or MCP change is required. The existing row data already supports this presentation refinement.

## 4. Edge Cases & Risks
* The front-loaded detail control must still remain clear on narrower widths.
* The queen identity cell must stay readable even when both marked and tagged cues are present.
* Column order changes must not break the expanded row `colSpan` or the horizontal overflow layout.

## 5. Implementation Phases
1. Phase 1: Move the detail control to the first column and keep row expansion behaviour intact.
2. Phase 2: Tighten the queen identity cell and update the feature note to reflect the tidier row composition.
