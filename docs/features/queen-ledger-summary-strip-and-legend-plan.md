# Feature: Queen Ledger Summary Strip And Legend
**Date:** 01/04/2026
**Status:** Implemented

## 1. Overview
The Queen Ledger header currently spends vertical space on descriptive copy that adds little operational value. This change streamlines the top of the ledger by removing that copy, making the summary totals collapsible and collapsed by default, and adding a short legend so users can understand the information shown on each queen card at a glance.

## 2. Scope & Simplicity
* **In Scope:** Remove the current intro block, wrap the existing summary totals in a collapsible section that starts collapsed, and add a concise legend for card badges and summary cues.
* **Out of Scope:** Changing ledger filters, altering card data fields, changing edit permissions, or modifying NIHBS logic.
* **Existing Code Impact:** The work stays inside `src/components/batches/QueenTrackerTab.tsx` and the related feature note in `docs/features/queen-tracker.md`.

## 3. Technical Design
### Architecture
The Queen Ledger remains a client-rendered tab backed by `useQueenTracker`. This pass only restructures the header presentation. The current totals are reused inside a collapsible summary strip that starts closed on first render, and a static legend block is rendered below it to explain the badges and quick status chips already present on the ledger cards.

### Database Connections (MCP Server)
No database query, schema, or MCP change is required. The UI continues to consume the existing ledger data already exposed by `useQueenTracker`.

## 4. Edge Cases & Risks
* The collapsible control must remain clear on mobile and desktop widths, especially when the strip starts closed.
* The legend should explain the current card language without drifting out of sync with actual badge text.
* The summary strip should not introduce extra state complexity or disturb existing filter interactions.

## 5. Implementation Phases
1. Phase 1: Simplify the header by removing the descriptive intro block and preserving the filter tray.
2. Phase 2: Convert the totals row into a default-collapsed summary strip and add a compact legend below it.
