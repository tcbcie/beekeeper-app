# Feature: Queen Ledger Action Label And Toggle Split
**Date:** 01/04/2026
**Status:** Implemented

## 1. Overview
This change corrects the Queen Ledger action-column refinement by separating the action labels from the action controls. The goal is to keep the denser control grid idea while avoiding the taller tile layout that made the rows heavier.

## 2. Scope & Simplicity
* **In Scope:** Keep a shallow label row and place only the compact action controls in a two-by-two grid beneath it.
* **Out of Scope:** Any change to the outcome data model, action behaviour, schema, or the wider ledger structure.
* **Existing Code Impact:** Limited to the Queen Ledger component and the tracker note.

## 3. Technical Design
### Architecture
The action cell now presents the four action labels as text only, with a compact two-by-two grid of toggles directly underneath. The inline date-capture editor stays attached below that grid.

### Database Connections (MCP Server)
No database or MCP change is needed. This is a presentational correction on top of the existing Queen Ledger interaction flow.

## 4. Edge Cases & Risks
* The control grid still needs to read clearly against the separate label row.
* The shallower layout must not break the inline date-capture editor alignment.
* The action column needs to become visually lighter than the current tile version, not merely different.

## 5. Implementation Phases
1. Phase 1: Split the action labels from the action controls.
2. Phase 2: Tighten spacing and update the tracker note.
