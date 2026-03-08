# Feature: Inspection Right-Sized Frames Prefill
**Date:** 08/03/2026
**Status:** Implemented

## 1. Overview
Improve new inspection data entry by prefilling "Right-Sized to How Many Frames" from the hive's most recent previous inspection when that previous inspection already recorded a right-sized frames value. This reduces repetitive entry while keeping the beekeeper free to change the value for the new visit.

## 2. Scope & Simplicity
* **In Scope:** Prefill `right_sized_frames` in new inspections from the latest previous inspection for the selected hive when a non-null value exists.
* **Out of Scope:** Changing edit-inspection behaviour, adding new database queries, or carrying forward unrelated inspection fields automatically.
* **Existing Code Impact:** `src/app/dashboard/records/page.tsx` will derive the latest per-hive value from the loaded inspections list; `src/components/records/forms/InspectionForm.tsx` will consume that prefill for create flows.

## 3. Technical Design
### Architecture
The Records page already loads recent inspections and keeps them sorted by most recent date. The implemented change derives a lightweight latest-right-sized-frames lookup keyed by hive ID from that existing in-memory data. The inspection form receives that lookup as a prop and uses it only for create flows, applying the previous value when the hive context is selected or inherited. Edit flows continue to use the saved inspection data directly.

### Database Connections (MCP Server)
No database queries, schema changes, or MCP database work are required for this change because the necessary inspection history is already fetched by the Records page.

## 4. Edge Cases & Risks
* Ensure the prefill only runs for new inspections, not edits.
* Ensure no value is prefilled when the most recent previous inspection for that hive has no `right_sized_frames` value.
* Ensure changing the selected hive updates the prefilled value to that hive's latest previous inspection context.
* Ensure a manually changed value in the new form is not overwritten again unless the hive context itself changes.

## 5. Implementation Phases
1. Phase 1: Derive the latest previous right-sized frames value per hive from the loaded inspections data.
2. Phase 2: Apply that value to new inspection create flows when the selected hive context is established.
