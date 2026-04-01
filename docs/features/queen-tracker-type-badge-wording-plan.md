# Feature: Queen Tracker Type Badge Wording
**Date:** 31/03/2026
**Status:** Implemented

## 1. Overview
This change clarifies the Queen Tracker header badges by renaming the distribution-type badge for `mated_queen` records. The goal is to distinguish how the queen was distributed from the queen's current lifecycle state shown by the separate `Mated` badge.

## 2. Scope & Simplicity
* **In Scope:** Update the distribution-type label text for `mated_queen` rows in the Queen Tracker and document the wording change.
* **Out of Scope:** Changing lifecycle logic, badge order, tracker filters, distribution data, or any database behaviour.
* **Existing Code Impact:** Keep the change limited to `src/components/batches/QueenTrackerTab.tsx` and the Queen Tracker feature documentation.

## 3. Technical Design
### Architecture
The Queen Tracker already renders a type badge and a lifecycle badge from separate formatting helpers. This change only updates the type-badge label so the two badges communicate different concepts more clearly.

### Database Connections (MCP Server)
No database queries, schema changes, or MCP work are required. The change is presentational only.

## 4. Edge Cases & Risks
* The new wording should remain short enough to fit the current badge layout on smaller widths.
* The lifecycle badge must remain unchanged so the tracker still communicates current queen state.
* The wording must stay consistent with the broader Queen Tracker terminology already used in the feature documentation.

## 5. Implementation Phases
1. Phase 1: Update the `mated_queen` distribution-type label in the Queen Tracker badge formatter.
2. Phase 2: Update the Queen Tracker documentation to reflect the clearer badge wording.

## 6. Implementation Notes
- The Queen Tracker distribution-type badge for `mated_queen` rows now reads `Distributed as mated`.
- The lifecycle badge remains `Mated`, preserving the distinction between distribution type and current queen state.
