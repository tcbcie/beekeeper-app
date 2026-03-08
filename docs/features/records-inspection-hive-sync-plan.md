# Feature: Records Inspection Hive Sync
**Date:** 08/03/2026
**Status:** Implemented

## 1. Overview
Ensure the Records page keeps the top hive filter and the "Record New Inspection" form aligned during create flows. When a hive is selected in the top filters, a new inspection should inherit that hive directly, rather than only inheriting the apiary and requiring the beekeeper to pick the hive again.

## 2. Scope & Simplicity
* **In Scope:** Propagate the selected top-level hive filter into new inspection forms; keep the inherited hive and apiary aligned when the top filters change during create flows.
* **Out of Scope:** Refactoring other record forms, changing edit-inspection behaviour beyond what is necessary, or introducing persistence for filter choices.
* **Existing Code Impact:** `src/app/dashboard/records/page.tsx` will continue to own the records filter state; `src/components/records/forms/InspectionForm.tsx` will consume both selected apiary and selected hive for new inspections.

## 3. Technical Design
### Architecture
The records page already owns both `filters.apiaryId` and `filters.hiveId`, but only the apiary selection was previously propagated into `InspectionForm`. The implemented change extends that same page-owned context so new inspections now inherit both apiary and hive. The form continues to respect stronger existing context from edit flows and explicit preset-hive entry points, while using the top filters as the source of truth for normal create flows.

### Database Connections (MCP Server)
No database queries, schema changes, or MCP database work are required for this change.

## 4. Edge Cases & Risks
* Ensure edit inspections still remain tied to their saved hive rather than being overwritten by the top filters.
* Ensure preset-hive entry flows from query parameters still take precedence over the general top-filter inheritance.
* Ensure changing the top apiary to a different apiary clears any inherited hive that no longer belongs to that apiary.
* Ensure changing the top hive during a create flow updates the form consistently without leaving apiary and hive out of sync.

## 5. Implementation Phases
1. Phase 1: Pass the top-level selected hive into the inspection form create flow alongside the selected apiary.
2. Phase 2: Align the form’s internal hive and apiary state so top-filter changes update create flows without breaking edit or preset-hive behaviour.
