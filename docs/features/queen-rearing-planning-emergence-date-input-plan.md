# Feature: Queen Rearing Planning Emergence Date Input
**Date:** 11/03/2026
**Status:** Implemented

## 1. Overview
Extend the Queen Rearing planner so beekeepers can start from a target virgin queen emergence date as well as a graft date. This makes the planner useful both for forward planning from grafting and for reverse planning from a desired emergence weekday.

## 2. Scope & Simplicity
* **In Scope:** Add an input mode choice to the planner, support a target virgin emergence date, and keep the rest of the queen and drone timeline derived from one consistent source of truth.
* **Out of Scope:** Persisting planner scenarios, adding a third independent date source, changing database behaviour, or redesigning the rest of the Queen Rearing page.
* **Existing Code Impact:** Limited to `src/components/batches/QueenRearingPlanningTab.tsx` and the supporting Queen Rearing documentation.

## 3. Technical Design
### Architecture
The planner should keep one active source-date mode in component state, for example `graft` or `emergence`. The selected mode determines which date input is editable and which counterpart date is derived. All other milestones should continue to flow from the derived emergence date so the timeline stays coherent.

This keeps the logic simple:
- if the source is `graft`, derive emergence from graft + 12 days
- if the source is `emergence`, derive graft from emergence - 12 days
- then derive mating, laying, and drone timing from the resolved emergence date

### Database Connections (MCP Server)
No database access or schema changes are required. This remains a local planning tool only.

## 4. Edge Cases & Risks
* The two entry modes must not compete with each other or cause circular updates.
* Invalid or cleared dates must leave the user with a recoverable input state, not an empty dead end.
* The UI should make it obvious which date is being chosen directly and which is being calculated.
* Existing graft-date-first behaviour must remain intact when that mode is selected.

## 5. Implementation Phases
1. Phase 1: Introduce a single planner mode and source-date state that can resolve both graft and emergence dates safely.
2. Phase 2: Update the planner controls and visible milestone cards so the chosen entry point and derived counterpart are clear.
3. Phase 3: Align the planner documentation with the new dual-entry behaviour.
