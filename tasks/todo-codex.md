# Task: Records Non-Inspection Filter Prefill
**Date:** 09/03/2026
**Status:** Completed

## 1. Objective
Extend the Records page create flow so the top apiary and hive filters prefill new non-inspection records in the same way they already prefill new inspections. This covers varroa treatments, varroa checks, feedings, and harvests.

## 2. Impact Analysis
* **Files to Modify:** * `src/app/dashboard/records/page.tsx`
  * `src/components/records/forms/VarroaTreatmentForm.tsx`
  * `src/components/records/forms/VarroaCheckForm.tsx`
  * `src/components/records/forms/FeedingForm.tsx`
  * `src/components/records/forms/HarvestForm.tsx`
  * `docs/features/records-non-inspection-filter-prefill-plan.md`
* **Simplicity Check:** Reuse the existing records page filter state as the single source of truth for create-time apiary and hive context. Keep the change scoped to form props and create-flow sync logic, without changing database access, record schemas, or unrelated form behaviour.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Pass the current records apiary and hive filters from `src/app/dashboard/records/page.tsx` into the varroa treatment, varroa check, feeding, and harvest forms during create flows.
- [x] **Step 2:** Update `src/components/records/forms/VarroaTreatmentForm.tsx` and `src/components/records/forms/VarroaCheckForm.tsx` so new records inherit and stay aligned with the selected top-level apiary and hive, while edit flows keep their saved hive context.
- [x] **Step 3:** Update `src/components/records/forms/FeedingForm.tsx` and `src/components/records/forms/HarvestForm.tsx` so new records inherit and stay aligned with the selected top-level apiary and hive, while edit flows keep their saved hive context.
- [x] **Step 4:** Update documentation in `docs/features/records-non-inspection-filter-prefill-plan.md`
- [x] **Step 5:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The records page filter context is only passed into `InspectionForm`; the other record forms initialise their own apiary and hive state from the record object alone, so create flows ignore the current top filters unless a direct preset hive is supplied.
* **Summary of Changes:** Passed the records page apiary and hive filters into the non-inspection record forms, then hardened create-only sync logic so new varroa treatments, varroa checks, feedings, and harvests inherit the top filters without overwriting edit flows. Also aligned the inspection form with the same safer sync pattern and guarded treatment weather auto-fill against stale async updates.
* **Notes for User:** No database MCP work was required. I did not run build tests, per repo instruction; please test the affected create flows in the UI.

## Review
* **Root Cause:** Only `InspectionForm` consumed the Records page filter context. The other record forms derived apiary and hive state from their local record object only, so normal create flows started blank even when the page filters were already narrowed.
* **Changes Made:** Wired `selectedApiaryId` and `selectedHiveId` from the Records page into the varroa treatment, varroa check, feeding, and harvest forms. Added guarded create-flow sync so the forms inherit the active filter context, clear incompatible inherited hives when the top apiary changes, preserve saved-hive behaviour for edit flows, and avoid overriding manual in-form apiary changes. Also hardened inspection create sync to the same safer pattern and protected treatment weather auto-fill from stale async responses.
* **Testing Needed:** Please create a new varroa treatment, varroa check, feeding, and harvest from the Records page with: only apiary selected, apiary plus hive selected, and an edit flow, to confirm the new prefill behaviour and unchanged edit behaviour.
