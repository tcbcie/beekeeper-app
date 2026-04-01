# Feature: Queen Ledger Expanded Detail Layout
**Date:** 01/04/2026
**Status:** Implemented

## 1. Overview
This change compacts the expanded Queen Ledger detail row and replaces the current four equal cards with a denser layout that better fits how the data is actually used. The goal is to reduce wasted height, surface the most important context faster, and make the editable outcomes area feel like the primary workspace instead of just another card.

## 2. Scope & Simplicity
* **In Scope:** Re-group the existing expanded-row content into a more compact, more intentional detail layout.
* **Out of Scope:** Any change to the underlying Queen Ledger data, filters, actions, or schema.
* **Existing Code Impact:** Limited to the expanded detail rendering in the Queen Ledger component and the tracker note.

## 3. Technical Design
### Architecture
The expanded detail row now uses a denser two-panel layout:
* a compact `Reference Context` panel that folds the read-only queen, breeding, batch, and distribution facts into tighter grids,
* a wider `Outcomes` panel that keeps the editable workflow together,
* a small fact strip at the top of the reference side so the most useful context remains immediately visible without repeating the old card stack.

### Database Connections (MCP Server)
No database or MCP change is needed. This is a presentation-only refinement on top of the existing Queen Ledger data.

## 4. Edge Cases & Risks
* The compacted layout must still remain readable on smaller laptop widths.
* The editable outcomes area must not become visually buried among the read-only context fields.
* Compacting the read-only sections too aggressively could make the expanded row feel harder to scan if spacing is not handled carefully.

## 5. Implementation Phases
1. Phase 1: Replace the four equal cards with an asymmetric `Reference Context` plus `Outcomes` layout.
2. Phase 2: Compact the read-only fields into tighter grids, remove the old bottom chip strip, and update the tracker note.
