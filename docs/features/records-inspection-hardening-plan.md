# Feature: Records Inspection Data-Flow Hardening
**Date:** 08/03/2026
**Status:** Implemented

## 1. Overview
This change hardens the Records inspection flow so new inspections initialise from a valid form model, loading state only resolves when all required records data is ready, and right-sized frame prefills remain stable even when inspection history arrives later or multiple inspections exist on the same day.

## 2. Scope & Simplicity
* **In Scope:** Stabilise records loading ownership, improve inspection fetch failure handling, remove the partial `Inspection` create-flow cast, and make previous-inspection right-sized prefills deterministic.
* **Out of Scope:** Database schema changes, UI redesign, new record types, and any refactor of unrelated forms or filters.
* **Existing Code Impact:** `src/hooks/useRecordsData.ts`, `src/app/dashboard/records/page.tsx`, and `src/components/records/forms/InspectionForm.tsx`.

## 3. Technical Design
### Architecture
`useRecordsData()` should remain the single source of fetched records state, with `fetchAllData()` as the only owner of the page-level loading lifecycle during coordinated fetches. The Records page should pass a proper `InspectionFormData` draft for create flows instead of forging a partial `Inspection`. `InspectionForm` should treat previous-inspection prefills as data-dependent state, so the prefill guard must account for both the selected hive and the resolved historical value.

### Database Connections (MCP Server)
No new database queries or schema changes are planned. Existing Supabase reads in `useRecordsData()` will be hardened by checking query errors and using deterministic ordering for inspections with both `inspection_date` and `inspection_time`.

## 4. Edge Cases & Risks
* Inspection fetches can return no rows, partial rows, or an error; stale records state must not remain visible after a failed refresh.
* New inspection create flows must not depend on partially populated domain objects that can leak `undefined` into form state.
* Previous right-sized values can arrive after the selected hive is already set; prefill logic must re-evaluate when the underlying history value changes.
* Multiple inspections on the same date need a stable secondary ordering field to avoid non-deterministic prefills.

## 5. Implementation Phases
1. Phase 1: Consolidate records loading ownership and inspection error handling in `useRecordsData.ts`.
2. Phase 2: Split new-inspection draft state from edit-inspection state in `page.tsx`.
3. Phase 3: Harden right-sized previous-value derivation and late-data prefill behaviour in `page.tsx` and `InspectionForm.tsx`.
