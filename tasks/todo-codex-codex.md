# Task: DCA Fallback Hotspot Fix
**Date:** 16/04/2026
**Status:** Completed

## 1. Objective
Ensure that a valid selected apiary on the community map always returns at least one low-confidence DCA hotspot instead of silently returning nothing, and make the fallback state visible in the existing DCA panel.

## 2. Impact Analysis
* **Files to Modify:** * `src/lib/dca-prediction.ts`
  * `src/hooks/useDCAPredictions.ts`
  * `src/app/dashboard/community-map/page.tsx`
  * `docs/features/dca-prediction.md`
  * `docs/features/dca-fallback-hotspot-fix-plan.md`
* **Simplicity Check:** This stays inside the existing DCA engine, hook, and current map panel. It does not add schema changes, new services, or a broader model rewrite. The fix is limited to preserving a bounded fallback result and making the zero-result or fallback state legible to the user.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Adjust the DCA engine filtering so a valid selected apiary can preserve its best candidate as a low-confidence fallback when normal thresholding would otherwise remove every result.
- [x] **Step 2:** Update the result shape and hook flow as needed so fallback-only output is distinguishable from stronger predictions without breaking the current map rendering path.
- [x] **Step 3:** Update the community-map DCA panel so it communicates whether a fallback hotspot was returned or whether no result could be produced at all.
- [x] **Step 4:** Update documentation in `docs/features/dca-prediction.md` and capture the implementation intent in `docs/features/dca-fallback-hotspot-fix-plan.md`.
- [x] **Step 5:** Present the completed fix and prompt you to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The current engine prefers returning no result over returning a weak but explicit fallback. In low-relief or single-apiary cases this leaves the user with no DCA marker and no useful explanation, even when a low-confidence local guess would be more appropriate.
* **Summary of Changes:** Implemented a bounded fallback hotspot path inside the DCA engine, added explicit fallback state to predictions, surfaced fallback or empty-result messaging in the community-map panel, and updated the DCA documentation and fallback fix plan.
* **Notes for User:** No build testing was run by me per repository instruction. No database schema change was required for this fix.
