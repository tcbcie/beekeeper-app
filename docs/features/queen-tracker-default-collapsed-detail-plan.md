# Feature: Queen Tracker Default Collapsed Detail
**Date:** 31/03/2026
**Status:** Implemented

## 1. Overview
Refine the Queen Tracker card interaction so each record opens in a compact summary state by default instead of immediately showing the full four-panel detail layout. This should reduce visual density and let users scan the queen list more quickly before expanding the records they want to inspect.

## 2. Scope & Simplicity
* **In Scope:** Collapse the tracker detail body by default, expose a clear expand/collapse control on desktop and mobile, and update the Queen Tracker documentation to reflect the new default interaction.
* **Out of Scope:** Redesigning the tracker card layout, changing tracker data fields, or altering any outcome logic, permissions, or database queries.
* **Existing Code Impact:** Keep the work contained to `src/components/batches/QueenTrackerTab.tsx` and the related Queen Tracker documentation.

## 3. Technical Design
### Architecture
The Queen Tracker remains a client-rendered card ledger on `/dashboard/batches`. This change only adjusts the presentation state: cards will render their summary header first and reveal the detail grid only when expanded through the existing per-record toggle state.

### Database Connections (MCP Server)
No database changes or new queries are required. The feature only changes the default expanded state and the visibility of the existing UI body.

## 4. Edge Cases & Risks
* If the expand control remains mobile-only, collapsing by default on desktop would strand the detailed content behind an unreachable state.
* The collapsed state still needs to preserve the key summary information so users can understand the row before expanding it.
* The interaction should remain consistent for both editable and read-only rows.

## 5. Implementation Phases
1. Phase 1: Update the tracker card container so detail panels stay collapsed until the current record is expanded.
2. Phase 2: Surface a clear expand/collapse affordance across breakpoints and document the new default behaviour.
