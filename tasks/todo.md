# Task: Align Nuc Card Distribute with Batch Queen Tracking
**Date:** 03/03/2026
**Status:** Complete — awaiting user testing

## 1. Objective
The "Distribute" button on the mating nuc card is missing the **Group Member** recipient tab and has weaker error handling compared to the Batch Queen Tracking version. Fix both issues so nuc-originated distributions can correctly target group members (important for NIHBS reporting).

## 2. Execution Plan — `src/components/batches/MatingNucsTab.tsx` only

- [x] **Step 1:** Add `rearing_group_id` to `Batch` interface and `fetchBatches` select query
- [x] **Step 2:** Add `distributeGroupMemberIds` state + `useEffect` to fetch group members when distribute modal opens
- [x] **Step 3:** Pass `groupMemberIds={distributeGroupMemberIds}` to `DistributeGraftModal`
- [x] **Step 4:** Fix `handleDistributeSave` 3-way check (`true`/`false`/`null`) matching `useBatchGrafts` pattern

## 3. Post-Task Review
* **Summary of Changes:**
  - **Batch interface:** Added `rearing_group_id: string | null` field and updated `fetchBatches` select to include it.
  - **Group member fetch:** Added `distributeGroupMemberIds` state. Added `useEffect` keyed on `distributeNuc` that looks up the nuc's batch `rearing_group_id`, queries `rearing_group_members` for user IDs, and stores them. Clears when modal closes.
  - **Modal prop:** Added `groupMemberIds={distributeGroupMemberIds}` to `DistributeGraftModal`, enabling the "Group Member" recipient tab when members exist.
  - **Error handling:** Changed `if (success)` to `if (success === true)` and added `else if (success === false)` branch with "This graft has already been distributed" message, matching the `useBatchGrafts` pattern.
* **Scope:** 1 file changed (`MatingNucsTab.tsx`). No new dependencies. No migrations.
* **Testing:** User should verify: (1) Group Member tab appears when nuc's batch belongs to a rearing group, (2) distributing to a group member works, (3) already-distributed graft shows correct message, (4) nuc with no group still works normally.
