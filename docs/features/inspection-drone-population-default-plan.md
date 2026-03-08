# Feature: Inspection Drone Population Default State
**Date:** 08/03/2026
**Status:** Implemented

## 1. Overview
Ensure the inspection form does not imply a drone population value before the user makes an explicit choice. New inspections should open with no drone population level selected, which avoids accidentally recording `Extreme` when the beekeeper has not interacted with that control.

## 2. Scope & Simplicity
* **In Scope:** Change the default new-inspection value for drone population to the existing unset sentinel used elsewhere in the records flow.
* **Out of Scope:** Redesigning the drones UI, adding new buttons, or changing how saved inspections with real drone values are displayed.
* **Existing Code Impact:** `src/types/records.ts` will be updated for the default form state; existing records page submission and display logic will remain in place.

## 3. Technical Design
### Architecture
The records flow already supports an unset `drones_present` state by converting `-1` to `null` on submit and by suppressing display of unset values in the inspection card. The implemented fix aligns the initial form default with that existing behaviour, so new inspections now start in an unselected state without introducing new state paths.

### Database Connections (MCP Server)
No database queries, schema changes, or MCP database work are required for this change.

## 4. Edge Cases & Risks
* Ensure existing saved inspections still render their stored drone population correctly.
* Ensure edited inspections with a stored value still preselect the correct button.
* Ensure a newly created inspection without any drone selection continues to submit as `null` rather than a numeric level.

## 5. Implementation Phases
1. Phase 1: Change the default new-inspection `drones_present` value to the existing unset sentinel.
2. Phase 2: Confirm the existing submit and display logic still handles unset and saved values correctly.
