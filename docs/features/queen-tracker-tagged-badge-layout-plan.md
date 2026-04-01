# Feature: Queen Tracker Tagged Badge Layout
**Date:** 01/04/2026
**Status:** Implemented

## 1. Overview
This change adjusts how the Queen Tracker presents tagged queens. Instead of using the queen number as the main title, the tracker will keep the cell label in the title area and present the queen tag as a separate compact badge beside the marking summary.

## 2. Scope & Simplicity
* **In Scope:** Keep the cell label as the primary title, add a separate `Queen Tagged` badge for tagged queens, and update the related detail wording.
* **Out of Scope:** Changing any underlying queen numbering logic, tracker filters, data loading, or database behaviour.
* **Existing Code Impact:** Keep the change limited to `src/components/batches/QueenTrackerTab.tsx` and the Queen Tracker feature documentation.

## 3. Technical Design
### Architecture
The Queen Tracker already receives both `cell_number` and `queen_number`. This change only alters how those existing fields are mapped into the header and detail presentation, with the queen number shown under `Queen Tagged`.

### Database Connections (MCP Server)
No database queries, schema changes, or MCP work are required. The change is presentational only.

## 4. Edge Cases & Risks
* Queens without a recorded number must continue to render cleanly without an empty badge.
* The added badge must fit the current header layout without crowding the existing marking and weight badges.
* Detail wording should avoid implying that a cell label and a queen tag are the same concept.

## 5. Implementation Phases
1. Phase 1: Update the tracker's derived display fields so cell and queen-tag presentation are separated.
2. Phase 2: Update the Queen Tracker header and detail wording to use the new tagged badge layout.

## 6. Implementation Notes
- The Queen Tracker title now stays on `Cell #...` even when a queen has a recorded tag.
- Tagged queens now show a separate `Queen Tagged ...` badge beside the marking badge.
- The detail panel now labels the recorded queen number as `Queen Tagged`.
