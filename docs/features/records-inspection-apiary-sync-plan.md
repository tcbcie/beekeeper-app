# Feature: Records Inspection Apiary Sync
**Date:** 08/03/2026
**Status:** Implemented

## 1. Overview
Ensure the Records page treats the selected apiary consistently when creating a new inspection. If a user has exactly one apiary, that apiary should be preselected in the top records filter and in the "Record New Inspection" form. If the user changes the apiary in the top filter while creating a new inspection, the form should inherit that selection so the hive list stays aligned with the page context.

## 2. Scope & Simplicity
* **In Scope:** Default the records apiary filter for single-apiary users; propagate the top apiary filter into the new inspection form; preserve hive filtering within the inspection form based on the propagated apiary.
* **Out of Scope:** Refactoring other records forms; changing edit-inspection behaviour beyond what is necessary; introducing database changes or new persistence for filter preferences.
* **Existing Code Impact:** `src/app/dashboard/records/page.tsx` will own the creation-time apiary context; `src/components/records/forms/InspectionForm.tsx` will consume that context while still deriving apiary from an explicitly selected hive.

## 3. Technical Design
### Architecture
The records page already owns the top filter state via `useRecordFilters`. The implemented change uses that page-level apiary selection as the source of truth for new inspection creation, then passes it into `InspectionForm` as the default and sync input for new inspections. The form still derives its apiary from the selected hive when a stronger hive context already exists, so edit and preset-hive flows are preserved. A guarded page effect now applies the sole available apiary automatically when apiary data loads and there is no stronger apiary or hive context to preserve.

### Database Connections (MCP Server)
No database schema changes or new queries are expected for this change. Existing records and apiary data loading remain unchanged, and no saved `.sql` files will be used.

## 4. Edge Cases & Risks
* Avoid overriding edit-inspection or preset-hive state when a hive already determines the apiary.
* Avoid resetting the selected hive unexpectedly when the top filter changes after a hive has already been chosen.
* Ensure the single-apiary default only applies when there is no stronger existing context, such as a selected hive or explicit filter selection.

## 5. Implementation Phases
1. Phase 1: Add a guarded page-level default for single-apiary users and expose the selected apiary to the inspection creation flow.
2. Phase 2: Update `InspectionForm` to consume the propagated apiary for new inspections while preserving existing hive-driven behaviour.
