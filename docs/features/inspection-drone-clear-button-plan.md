# Feature: Inspection Drone Population Clear Control
**Date:** 08/03/2026
**Status:** Implemented

## 1. Overview
Add an explicit clear control to the inspection form's drone population selector so the beekeeper can remove a previously chosen drone level without reopening the form or relying on indirect state changes.

## 2. Scope & Simplicity
* **In Scope:** Add a clear action to the drone population control in `InspectionForm` that resets `drones_present` to the existing unset sentinel.
* **Out of Scope:** Redesigning the whole drones section, changing database storage, or altering how other inspection controls behave.
* **Existing Code Impact:** `src/components/records/forms/InspectionForm.tsx` will gain a clear control in the drones section; existing submission and display logic can remain unchanged.

## 3. Technical Design
### Architecture
The records flow already supports an unset drone population state through the `-1` sentinel, which is converted to `null` on submit. The implemented change exposes that existing state directly in the UI by adding a clear action beside the current drone level buttons, keeping the underlying data model unchanged.

### Database Connections (MCP Server)
No database queries, schema changes, or MCP database work are required for this change.

## 4. Edge Cases & Risks
* Ensure the clear action resets the visual selected state reliably.
* Ensure edited inspections can clear a previously saved drone level before saving.
* Ensure the drone brood checkbox remains independent and is not affected by clearing the drone population value.

## 5. Implementation Phases
1. Phase 1: Add a clear control to the drone population selector in `InspectionForm`.
2. Phase 2: Confirm the clear action resets only `drones_present` and leaves the rest of the drones section unchanged.
