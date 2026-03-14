# Task: Dashboard Audit Hardening
**Date:** 14/03/2026
**Status:** Completed

## 1. Objective
Harden the dashboard apiary data flow by preventing stale async responses from overwriting newer state, stopping nullable brood fields from being misclassified as explicit brood absence, and preserving partial scale data when one scale fetch fails.

## 2. Impact Analysis
* **Files to Modify:** * `src/hooks/useDashboardStats.ts`
  * `src/components/dashboard/ApiaryWeatherRow.tsx`
  * `docs/features/dashboard-audit-hardening-plan.md`
  * `docs/features/dashboard-apiary-weather.md`
* **Simplicity Check:** Kept the change inside the existing dashboard hook and card component. The existing fetch flow, caches, and apiary enrichment pipeline remain in place, with only targeted defensive guards and stricter value interpretation added.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Add request-scoped guards to the dashboard hook so older async responses cannot overwrite newer dashboard state during retries or rapid reloads.
- [x] **Step 2:** Tighten the queen and brood roll-up logic so nullable brood fields remain unknown rather than being treated as confirmed brood absence, while keeping the 21-day brood-break tolerance intact.
- [x] **Step 3:** Update the dashboard card scale-fetch path to keep valid partial scale data visible even if one or more scale requests fail, and update documentation in `docs/features/dashboard-audit-hardening-plan.md`
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The dashboard relied on mounted-state checks alone, which do not prevent slower earlier requests from overwriting newer state. It also inferred brood absence from nullable inspection data and discarded all scale data when any single downstream scale request failed.
* **Summary of Changes:** Added request sequencing to the dashboard hook, changed brood-risk inference so only explicit brood absence starts a broodless run, and preserved partial scale data when only some scale endpoints succeed.
* **Notes for User:** No schema change was required. This hardening pass only changes client-side dashboard behaviour. Build tests were not run per repository instruction.

## Review
The dashboard now ignores stale async responses, treats nullable brood observations as unknown instead of confirmed absence, and keeps showing successful scale readings even when one connected scale endpoint fails.
