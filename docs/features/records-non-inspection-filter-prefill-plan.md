# Feature: Records Non-Inspection Filter Prefill
**Date:** 09/03/2026
**Status:** Implemented

## 1. Overview
Ensure the Records page applies the selected top-level apiary and hive filters to new non-inspection records in the same way it already does for new inspections. When a beekeeper opens a new varroa treatment, varroa check, feeding, or harvest from the Records page, the form should inherit the current filter context so the selected apiary and hive flow straight into the new record.

## 2. Scope & Simplicity
* **In Scope:** Propagate the Records page `apiaryId` and `hiveId` filter state into new varroa treatment, varroa check, feeding, and harvest forms; keep those create flows aligned if the user changes the top filters while the form is open.
* **Out of Scope:** Refactoring the inspection form, changing archive flows, altering database schema or queries, or introducing saved filter preferences.
* **Existing Code Impact:** `src/app/dashboard/records/page.tsx` will pass existing filter state into the non-inspection forms; `src/components/records/forms/VarroaTreatmentForm.tsx`, `src/components/records/forms/VarroaCheckForm.tsx`, `src/components/records/forms/FeedingForm.tsx`, and `src/components/records/forms/HarvestForm.tsx` will consume that state for create flows only.

## 3. Technical Design
### Architecture
The Records page already owns the active filter state through `useRecordFilters`, and that page-level state is already treated as the source of truth for new inspections. The implemented change extends the same pattern to the other record forms by passing `selectedApiaryId` and `selectedHiveId` into them. Each non-inspection form now applies that context only when creating a new record, while edit flows continue to derive their apiary and hive from the saved record. The sync was hardened so it reacts to external filter changes without fighting in-form user edits, and incompatible inherited hives are cleared only when the active top apiary truly conflicts with the current hive.

### Database Connections (MCP Server)
No database schema changes, new queries, or MCP database work are required. Existing records, hive, and apiary data loading remain unchanged, and no saved `.sql` files will be used.

## 4. Edge Cases & Risks
* Avoid overwriting edit forms with the top filters when the user is editing an existing varroa treatment, varroa check, feeding, or harvest.
* Ensure preset-hive entry points still work when a record is opened from a direct hive-specific link.
* Ensure changing the top apiary during a create flow clears any inherited hive that no longer belongs to that apiary.
* Preserve form-specific behaviour such as treatment honey-super warnings, treatment weather auto-fill, and varroa-check derived calculations when the hive is inherited from the top filters.

## 5. Implementation Phases
1. Phase 1: Extend the Records page to provide the current apiary and hive filter context to the non-inspection record forms.
2. Phase 2: Add guarded create-flow sync logic to the varroa treatment, varroa check, feeding, and harvest forms so they inherit and stay aligned with the top filters without disturbing edit flows.
