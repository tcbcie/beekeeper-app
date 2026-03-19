# Task: Community Map Conservation Toggle Default
**Date:** 16/03/2026
**Status:** Awaiting Approval

## 1. Objective
Change the Community Apiary Map so conservation areas are not enabled by default when the page first loads.

## 2. Impact Analysis
* **Files to Modify:** * `src/app/dashboard/community-map/page.tsx`
  * `docs/features/community-map-conservation-default-plan.md`
* **Simplicity Check:** Keep the fix limited to the existing client-side visibility state in the community map page. No data query, map layer logic, or backend behaviour needs to change.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [ ] **Step 1:** Change the initial `showConservationAreas` state so conservation areas start hidden when the community map page loads.
- [ ] **Step 2:** Keep the existing toggle and map-layer rendering flow intact so conservation areas still appear immediately when the user enables them.
- [ ] **Step 3:** Update documentation in `docs/features/community-map-conservation-default-plan.md`
- [ ] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The page initialises the conservation-area visibility state to `true`, so the layer is rendered on first load without user intent.
* **Summary of Changes:** Pending approval.
* **Notes for User:** This is a client-side default-state change only. No database or API change is required.
