# Feature: Queen Ledger Table Layout
**Date:** 01/04/2026
**Status:** Implemented

## 1. Overview
The Queen Ledger currently presents each queen as an individual card. That format works for smaller lists but becomes difficult to scan when the ledger grows, even with filters. This change converts the ledger into a denser table so users can read the estate more clearly at a glance, while still expanding any row to inspect the full queen record.

## 2. Scope & Simplicity
* **In Scope:** Replace the card list with a table-based ledger, keep important actions directly visible in the row, and move fuller contextual details into expandable row content.
* **Out of Scope:** Changing ledger data retrieval, altering filter behaviour, changing edit permissions, or modifying NIHBS logic.
* **Existing Code Impact:** The work stays primarily within `src/components/batches/QueenTrackerTab.tsx` plus the related feature note.

## 3. Technical Design
### Architecture
The Queen Ledger remains a client-rendered tab backed by `useQueenTracker`. The existing derived row model and row-level action handlers are reused. The UI shifts from card rendering to a table model with one summary row per queen and an adjacent expandable detail row for richer context.

### Database Connections (MCP Server)
No database or MCP change is required. The existing ledger data already contains the fields needed for a table-first layout.

## 4. Edge Cases & Risks
* The table must remain readable across narrower widths, likely through horizontal overflow rather than collapsing core columns away too aggressively.
* Inline actions must remain clearly disabled for read-only rows.
* Expanded row content must stay aligned to the selected queen so dense lists do not become visually confusing.

## 5. Implementation Phases
1. Phase 1: Replace the current card list with a summary table that exposes the key scanning fields and inline actions.
2. Phase 2: Move the fuller queen, breeding, destination, and outcome context into expandable detail rows and update the legend to match the new layout.
