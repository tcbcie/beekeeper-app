# Feature: Queen Ledger Row Tidy Pass
**Date:** 01/04/2026
**Status:** Implemented

## 1. Overview
The Queen Ledger has the right table structure now, but the row presentation is still carrying unnecessary clutter. This pass removes the redundant legend block and tightens the queen identity row so the user can read the ledger more quickly without repeated marking language or noisy chips.

## 2. Scope & Simplicity
* **In Scope:** Remove the legend section, simplify marked and tagged cues in the queen row, remove repeated marked or unmarked wording, and make age labelling clearer.
* **Out of Scope:** Changing table columns, altering row actions, modifying filters, or changing ledger data logic.
* **Existing Code Impact:** The work stays primarily within `src/components/batches/QueenTrackerTab.tsx` plus the related feature note.

## 3. Technical Design
### Architecture
The Queen Ledger remains a table-first client-rendered view backed by `useQueenTracker`. This pass only tidies the visual treatment of the summary row. The ledger data and expansion behaviour stay as they are.

### Database Connections (MCP Server)
No database or MCP change is required. The existing row data already supports the cleaner presentation.

## 4. Edge Cases & Risks
* Marked and tagged indicators must stay legible without relying on long text labels.
* Untagged and unmarked queens should still remain obvious rather than becoming visually ambiguous.
* The row summary must stay compact without hiding the age information entirely.

## 5. Implementation Phases
1. Phase 1: Remove the legend block and simplify the queen summary row cues.
2. Phase 2: Update the feature note to reflect the tidier row presentation.
