# Feature: Queen Tracker Marking Status Fix
**Date:** 01/04/2026
**Status:** Implemented

## 1. Overview
This change corrects the Queen Tracker's handling of queen marking status. The tracker should only show a marking colour when a queen has actually been marked, and the summary terminology should read as `Marked (Colour)` rather than implying that a computed year colour is itself a recorded marking event.

## 2. Scope & Simplicity
* **In Scope:** Use the existing `queen_marked` field to control whether marking colour appears in the tracker, and update the marking summary wording to the correct terminology.
* **Out of Scope:** Changing how queen marking is recorded elsewhere, introducing new marking fields, or altering any distribution, lifecycle, or database logic.
* **Existing Code Impact:** Keep the change limited to `src/components/batches/QueenTrackerTab.tsx` and the Queen Tracker feature documentation.

## 3. Technical Design
### Architecture
The Queen Tracker already receives `queen_marked` from `batch_grafts` and separately derives a year-based colour from `emergence_date`. This fix gates the colour display behind `queen_marked` and updates the summary text so the UI accurately reflects recorded marking state.

### Database Connections (MCP Server)
No database queries, schema changes, or MCP work are required. The fix uses existing tracker data already returned by the current hook.

## 4. Edge Cases & Risks
* Unmarked queens must not show a colour chip or colour-derived summary text.
* Marked queens without an emergence date should degrade gracefully instead of showing misleading wording.
* The detail panel must remain consistent with the header summary so the tracker does not present conflicting marking information.

## 5. Implementation Phases
1. Phase 1: Update the derived marking labels in the Queen Tracker so only marked queens display a colour.
2. Phase 2: Update the Queen Tracker summary wording and documentation to reflect the corrected marking terminology.

## 6. Implementation Notes
- The Queen Tracker now derives a marking colour only when `queen_marked` is true.
- Header and detail wording now use `Marked (Colour)` for marked queens and `Unmarked` for the rest.
- The colour dot beside the queen label only appears for marked queens with an available colour.
