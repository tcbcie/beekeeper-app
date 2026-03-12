# Task: Fix Queens Hatched Discrepancy Between Reports
**Date:** 05/03/2026
**Status:** Completed

## 1. Problem Analysis

Two reports show different values for "Queens Hatched" in March 2026:
- **NIHBS Monthly Return** (first screenshot): Shows 5 queens hatched
- **Monthly Rearing Report** (second screenshot): Shows 0 queens hatched

### Root Cause

The reports use different date logic to determine which month to count hatched queens:

1. **NIHBS Report** (`useNIHBSReport.ts` lines 168-225):
   - Uses `emergence_date` (or `graft_date + 12 days` fallback) to determine month
   - Queens hatched are counted in the **emergence month**
   - This is **correct** - queens hatch ~12 days after grafting

2. **Group Report** (`useRearingGroupReport.ts` lines 68-73, 165):
   - Filters batches by `graft_date` within the month
   - Sums `queens_hatched` from those batches
   - This is **incorrect** - attributes hatched queens to graft month, not emergence month

### Example
A batch grafted in February but hatching in March:
- NIHBS Report: Shows in **March** (correct)
- Group Report: Shows in **February** (incorrect) - hence 0 in March

## 2. Impact Analysis

* **Files to Modify:**
  * `src/hooks/useRearingGroupReport.ts` - Add emergence date logic
* **Simplicity Check:** Align the Group Report logic with NIHBS Report logic for post-emergence metrics (hatched, mated)

## 3. Execution Plan

- [x] **Step 1:** Add `emergence_date` to the batch query in `useRearingGroupReport.ts`
- [x] **Step 2:** Add helper function to derive emergence month/year (same as NIHBS)
- [x] **Step 3:** Track hatched/mated counts separately by emergence month, not graft month
- [ ] **Step 4:** Prompt user to test both reports

## 4. Post-Task Review

### Summary of Changes
Modified `src/hooks/useRearingGroupReport.ts`:

1. **Added `emergence_date` and `graft_date` to batch query** - Needed to determine which month queens actually emerged
2. **Added `getEmergenceMonthYear` helper** - Same logic as NIHBS report: uses `emergence_date` if set, otherwise falls back to `graft_date + 12 days`
3. **Widened batch query date range** - Now fetches batches from previous month too, since a batch grafted last month could emerge in the selected month
4. **Split aggregation logic**:
   - **Graft-time metrics** (batch_count, cell_count, grafts_accepted): Only counted for batches grafted in the selected month
   - **Post-emergence metrics** (queens_hatched, queens_mated): Only counted for batches that emerged in the selected month

### Notes for User
Please test by:
1. Opening the Monthly Rearing Report for March 2026
2. Confirming "Queens Hatched" now shows 5 (matching the NIHBS report)
3. Check other months to ensure the fix works correctly across different time periods

---

# Task: Audit 2025 GDD Values and Correct Stale Dandelion Record
**Date:** 06/03/2026
**Status:** Completed

## 1. Objective
Confirm the 2025 GDD inconsistency in `gdd_records`, correct the confirmed stale `Dandelion` rows for `01/04/2025`, and align regression coverage/documentation with the live seasonal-multiplier formula.

## 2. Impact Analysis
* **Files to Modify:**
  * `tasks/todo.md`
  * `tests/components/tools/GDDTracker.test.tsx`
  * `docs/features/gdd-tracker.md`
* **Data to Modify:** `public.gdd_records` rows for the confirmed stale `Dandelion` records only
* **Simplicity Check:** Keep this to a targeted data correction plus test/documentation alignment. No UI refactor or formula redesign is planned unless a live calculation bug appears during execution.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Apply a targeted MCP database update to the confirmed stale `2025-04-01` `Dandelion` rows so their stored GDD matches the current calculation scale used by the live tracker (`498.9` for the affected records).
- [x] **Step 2:** Update `tests/components/tools/GDDTracker.test.tsx` so the GDD logic assertions reflect the live seasonal-multiplier formula instead of the retired base-temperature model.
- [x] **Step 3:** Update `docs/features/gdd-tracker.md` to document the current formula clearly and note the data correction context for the 2025 outlier.
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** A partial historical backfill left `Dandelion` on `01/04/2025` with the pre-22/01/2026 GDD formula (`160.3`), while other 2025 rows were later recalculated with the current seasonal-multiplier formula.
* **Summary of Changes:** Corrected the two stale `Dandelion` rows in `public.gdd_records`, replaced the outdated GDD tracker test coverage with assertions that match the live seasonal-multiplier formula and current UI text, and refreshed `docs/features/gdd-tracker.md` with the active formula plus a historical data note.
* **Notes for User:** Please test the GDD Tracker and GDD Data screens in the app. The database correction updated only the two `Dandelion` rows dated `2025-04-01`, and I also noticed an unrelated existing data anomaly where `Hawthorn (Crataegus)` has an end date earlier than its bloom date.

## Review

- Database: Updated the two stale `Dandelion` records on `2025-04-01` from `160.3` to `498.9` and stamped a fresh `updated_at` value.
- Tests: Replaced the retired base-temperature assumptions in `tests/components/tools/GDDTracker.test.tsx` with the current seasonal-multiplier behaviour and current UI copy.
- Documentation: Rewrote `docs/features/gdd-tracker.md` in clean ASCII, documented the live formula, and recorded the 6 March 2026 historical data correction for traceability.
- Follow-up context: No build or automated test run was performed, per project instruction. An unrelated existing worktree file remains unmodified: `.claude/plans/sprightly-strolling-dream.md`.

---

# Task: Correct 2025 Hawthorn End Date Data Error
**Date:** 06/03/2026
**Status:** Completed

## 1. Objective
Correct the invalid `Hawthorn (Crataegus)` 2025 end date values that were stored earlier than the bloom start date.

## 2. Impact Analysis
* **Files to Modify:**
  * `tasks/todo.md`
* **Data to Modify:** `public.gdd_records` rows for the two affected 2025 `Hawthorn (Crataegus)` records only
* **Simplicity Check:** Apply a targeted data correction only. No code or formula changes are required because `gdd_value` is based on the bloom start date rather than the bloom end date.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Update the two `Hawthorn (Crataegus)` rows for `2025-04-28` from `end_date = 2025-02-16` to `end_date = 2025-05-16`.
- [x] **Step 2:** Verify that the corrected rows now carry the expected end date and unchanged `gdd_value`.
- [x] **Step 3:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The stored `Hawthorn (Crataegus)` end date appears to have a month typo (`02` instead of `05`), leaving the bloom end earlier than the bloom start.
* **Summary of Changes:** Updated the two affected 2025 `Hawthorn (Crataegus)` rows from `2025-02-16` to `2025-05-16` and verified that `gdd_value` remained `781.3`.
* **Notes for User:** No build or automated test run was performed. Please refresh the GDD views and confirm the corrected end date now appears as `16/5/2025`.

## Review

- Database: Updated the two `Hawthorn (Crataegus)` 2025 rows with `start_date = 2025-04-28` so `end_date` is now `2025-05-16`.
- Verification: Confirmed both rows now show the corrected end date and still retain `gdd_value = 781.3`.

---

# Task: Sync Records Apiary Selection Into New Inspection
**Date:** 08/03/2026
**Status:** Completed

## 1. Objective
Ensure the Records page preselects the user's only apiary when opening a new inspection, and keep the top apiary filter propagated into the "Record New Inspection" form for new inspections.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/app/dashboard/records/page.tsx`
  * `src/components/records/forms/InspectionForm.tsx`
  * `docs/features/records-inspection-apiary-sync-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** Keep the existing page-level records filter as the source of truth for the selected apiary during new inspection creation, and only add the minimum form sync needed. No database work, no wider refactor of other record forms, and no changes to edit-inspection behaviour unless required for correctness.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Update `src/app/dashboard/records/page.tsx` to auto-select the sole available apiary when the user has exactly one apiary and no more specific apiary or hive context has already been chosen.
- [x] **Step 2:** Pass the current records apiary selection into `InspectionForm` and keep new-inspection apiary selection aligned when the top filter changes, without overriding hive-driven or edit-inspection state.
- [x] **Step 3:** Update documentation in `docs/features/records-inspection-apiary-sync-plan.md`
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The Records page filter state and `InspectionForm` apiary state are currently managed separately, so new inspections do not inherit the selected or sole apiary.
* **Summary of Changes:** Added a guarded single-apiary default on the Records page and passed the selected top-level apiary into `InspectionForm`, where new inspections now stay aligned with the top filter while preserving edit and preset-hive behaviour.
* **Notes for User:** No build or automated test run was performed, per project instruction. Please test the overview-to-records new inspection flow and the top-filter-to-form sync manually.

## Review

- Records filter initialisation: `src/app/dashboard/records/page.tsx` now auto-selects the sole apiary once when there is no stronger hive or apiary context.
- New inspection sync: `src/components/records/forms/InspectionForm.tsx` now accepts the selected top-level apiary and applies it to new inspections, clearing the chosen hive only when the top filter switches to a different apiary.
- Context preservation: existing edit inspections and preset-hive flows keep their hive-derived apiary rather than being overwritten by the top filter.

---

# Task: Clear Default Drone Population Selection In New Inspections
**Date:** 08/03/2026
**Status:** Completed

## 1. Objective
Ensure the "Drone Population Level" control in new inspection forms starts with no option selected instead of preselecting "Extreme".

## 2. Impact Analysis
* **Files to Modify:**
  * `src/types/records.ts`
  * `docs/features/inspection-drone-population-default-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** Use the existing unset sentinel already supported by the records flow for `drones_present`, and only change the new-inspection default state. No database changes, no form redesign, and no change to saved inspection values.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Update the default inspection form state in `src/types/records.ts` so `drones_present` starts unset rather than defaulting to the `Extreme` option.
- [x] **Step 2:** Verify the existing submission and display flow still treats the unset value correctly for new and edited inspections.
- [x] **Step 3:** Update documentation in `docs/features/inspection-drone-population-default-plan.md`
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The default inspection form state sets `drones_present` to `3`, which maps directly to the `Extreme` button styling.
* **Summary of Changes:** Changed the new-inspection default for `drones_present` to the existing unset sentinel `-1`, leaving the current submit and display logic in place so unset values continue to save as `null` and remain visually unselected.
* **Notes for User:** No build or automated test run was performed, per project instruction. Please verify the new inspection drones section manually.

## Review

- Default state: `src/types/records.ts` now initialises `drones_present` to `-1`, so no drone population button is selected by default in a new inspection.
- Existing flow compatibility: the current records submit path still converts `-1` to `null`, and the inspection card still suppresses unset drone population values.

---

# Task: Inherit Top Hive Filter In New Inspection Form
**Date:** 08/03/2026
**Status:** Completed

## 1. Objective
Ensure the "Record New Inspection" form also inherits the top hive filter for create flows, so the selected hive at the top of the Records page is reflected directly in the new inspection form.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/app/dashboard/records/page.tsx`
  * `src/components/records/forms/InspectionForm.tsx`
  * `docs/features/records-inspection-hive-sync-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** Extend the existing page-to-form synchronisation so the top hive filter becomes the source of truth for new inspection create flows, while preserving edit-inspection and preset-hive behaviour. No database work, no refactor of other record forms, and no change to saved inspection records.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Update `src/app/dashboard/records/page.tsx` to pass the selected top-level hive filter into `InspectionForm` for new inspection creation.
- [x] **Step 2:** Update `src/components/records/forms/InspectionForm.tsx` so new inspections inherit the selected top hive, keep apiary and hive in sync, and only clear or override values when the top filters change to a conflicting context.
- [x] **Step 3:** Update documentation in `docs/features/records-inspection-hive-sync-plan.md`
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The Records page filter state currently propagates apiary selection into new inspections, but not the top-level hive selection, so create flows can still diverge from the page context.
* **Summary of Changes:** Passed the selected top-level hive filter into `InspectionForm` and extended the existing create-flow sync so new inspections now inherit both top apiary and top hive context while preserving edit and preset-hive behaviour.
* **Notes for User:** No build or automated test run was performed, per project instruction. Please verify the top-filter-to-new-inspection hive inheritance manually.

## Review

- Page-to-form propagation: `src/app/dashboard/records/page.tsx` now passes `filters.hiveId` into the inspection form alongside the selected apiary.
- Create-flow sync: `src/components/records/forms/InspectionForm.tsx` now applies the selected top hive to new inspections and derives the matching apiary automatically from that hive.
- Context preservation: edit inspections and explicit preset-hive entry flows still keep their stronger existing hive context instead of being overwritten by the top filters.

---

# Task: Add Clear Button To Inspection Drone Population Control
**Date:** 08/03/2026
**Status:** Completed

## 1. Objective
Add a clear button to the "Drone Population Level" control in the new inspection form so the user can explicitly reset that selection back to no value.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/components/records/forms/InspectionForm.tsx`
  * `docs/features/inspection-drone-clear-button-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** Keep this as a surgical UI change inside the existing drones section by reusing the current unset sentinel for `drones_present`. No database changes, no broader form refactor, and no change to how saved values are displayed.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Update `src/components/records/forms/InspectionForm.tsx` to add a clear action for the drone population selector that resets `drones_present` to the existing unset value.
- [x] **Step 2:** Keep the control styling and layout consistent so the clear action works for both new and edited inspections without affecting the existing drone brood checkbox.
- [x] **Step 3:** Update documentation in `docs/features/inspection-drone-clear-button-plan.md`
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The drone population control currently exposes only the four level buttons, so there is no direct way to reset the field to its unset state from the UI.
* **Summary of Changes:** Added a clear button beside the drone population label in `InspectionForm`, wired it to reset `drones_present` to `-1`, and left the existing submit and display logic unchanged.
* **Notes for User:** No build or automated test run was performed, per project instruction. Please verify the drones control manually.

## Review

- Drones UI: `src/components/records/forms/InspectionForm.tsx` now shows a `Clear` button in the drone population control header.
- Field behaviour: the clear action resets only `drones_present` to the existing unset sentinel and does not alter the drone brood checkbox.

---

# Task: Prefill Right-Sized Frames From Previous Inspection
**Date:** 08/03/2026
**Status:** Completed

## 1. Objective
When creating a new inspection, prefill "Right-Sized to How Many Frames" from the most recent previous inspection for the same hive when that previous inspection already has a right-sized frames value.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/app/dashboard/records/page.tsx`
  * `src/components/records/forms/InspectionForm.tsx`
  * `docs/features/inspection-right-sized-frames-prefill-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** Reuse the inspections data the Records page already loads and pass only the minimal latest-per-hive value into the inspection form. No new database calls, no changes to edit-inspection behaviour, and no refactor of other inspection fields.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Update `src/app/dashboard/records/page.tsx` to derive the latest previous `right_sized_frames` value for each hive from the already loaded inspections data and pass the selected hive’s value into `InspectionForm` for create flows.
- [x] **Step 2:** Update `src/components/records/forms/InspectionForm.tsx` so new inspections prefill `right_sized_frames` from that previous-inspection value when a hive is selected or inherited, without overriding edit-inspection data or later manual changes unless the hive context changes.
- [x] **Step 3:** Update documentation in `docs/features/inspection-right-sized-frames-prefill-plan.md`
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The new inspection form currently initialises `right_sized_frames` empty every time, even though the Records page already has the latest inspection data needed to carry that value forward for the same hive.
* **Summary of Changes:** Derived the latest previous `right_sized_frames` value per hive from the loaded inspections list in the Records page and applied it in `InspectionForm` for new-inspection create flows whenever the hive context is selected or inherited.
* **Notes for User:** No build or automated test run was performed, per project instruction. Please verify the right-sized frames prefill manually in the new inspection flow.

## Review

- Records data reuse: `src/app/dashboard/records/page.tsx` now builds a latest per-hive right-sized frames lookup from the already loaded inspection history.
- Create-flow prefill: `src/components/records/forms/InspectionForm.tsx` now applies that previous value when a new inspection gets a hive context, including inherited top-filter hive selection.
- Context safety: edit inspections still use their saved values, and the prefill only reapplies when the hive context itself changes.

---

# Task: Fix Nuc Card Status Label — "Mating" Should Be "Mated"
**Date:** 08/03/2026
**Status:** In Progress

## 1. Problem
When a nuc inspection records queen_status as "mated", the nuc status is set to DB value `mating`. The UI label for this status displays "Mating", but it should display "Mated" since this status is only set when mating is confirmed.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/components/batches/MatingNucsTab.tsx` — change label from "Mating" to "Mated"
* **Simplicity Check:** Single label change. The DB value `mating` stays the same. No schema changes, no sync logic changes.

## 3. Execution Plan
- [x] **Step 1:** Change the label for the `mating` status from "Mating" to "Mated" in `MatingNucsTab.tsx`
- [ ] **Step 2:** Prompt user to test the build

## 4. Post-Task Review
* **Root Cause Found:** The `NUC_STATUSES` array used the label "Mating" for DB value `mating`, but this status is only set when an inspection confirms `queen_status = 'mated'`, making the label misleading.
* **Summary of Changes:** Changed the display label from "Mating" to "Mated" in `src/components/batches/MatingNucsTab.tsx` line 91. No DB or sync logic changes.
* **Notes for User:** Please test by viewing a nuc with `mating` status — the badge should now read "Mated".

---

# Task: Always Allow Single Cell Selection in Queen Tracking Table
**Date:** 08/03/2026
**Status:** In Progress

## 1. Problem
In the Queen Tracking table, checkboxes only appear when "Bulk Actions" mode is enabled. Users want to select individual cells at any time and use the same action bar (change status, apply date, mark/unmark queen, distribute, delete) without entering bulk mode.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/components/batches/QueenTrackingSection.tsx` — always show checkboxes + show action bar when cells selected
* **Simplicity Check:** Remove the `tableSelectMode` guards on checkboxes and action bar visibility. Keep the Bulk Actions button for Select All/Deselect All. No logic changes to the actions themselves.

## 3. Execution Plan
- [x] **Step 1:** Always show the checkbox column in desktop table (remove `tableSelectMode &&` guard on `<th>` and `<td>`)
- [x] **Step 2:** Always show the checkbox on mobile cards (remove `tableSelectMode &&` guard)
- [x] **Step 3:** Show the action bar when `tableSelectedIds.size > 0` OR `tableSelectMode` is true
- [ ] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
* **Summary of Changes:** Removed `tableSelectMode` guards on checkboxes (desktop `<th>`/`<td>` and mobile card) so they always show for unlocked rows. Changed action bar condition from `tableSelectMode` to `tableSelectMode || tableSelectedIds.size > 0` so it appears whenever cells are selected.
* **Notes for User:** Please test — checkboxes should now always be visible, and selecting any cell should show the action bar without needing to click "Bulk Actions" first.

---

# Task: Auto-Create Queen Record on Distribution to App User
**Date:** 08/03/2026
**Status:** In Progress

## 1. Problem
When distributing a queen (cell, virgin, or mated) to an app user (self, group member, or searched user), no queen record is created in the recipient's Queens page. The user wants a queen record automatically created for the recipient.

## 2. Impact Analysis
* **Files to Modify:**
  * Database — new RPC function `create_queen_for_distribution` (SECURITY DEFINER to bypass INSERT RLS)
  * `src/hooks/useGraftDistributions.ts` — call RPC after successful distribution to app user
* **Simplicity Check:** Single RPC function + hook additions. No UI changes. Queen creation is non-blocking (distribution succeeds even if queen creation fails). No changes to the distribute modal or queen management pages.

## 3. Execution Plan
- [x] **Step 1:** Create DB migration with `create_queen_for_distribution` RPC function
- [x] **Step 2:** In `createDistribution`, after successful app-user distribution, fetch batch/graft details and call RPC to create queen
- [x] **Step 3:** In `createBulkDistributions`, same for each graft in bulk
- [ ] **Step 4:** Prompt user to test the build

## Queen Data Mapping
- `queen_number` → graft's `queen_number` if set, else `"Cell #N"`
- `birth_date` → batch `emergence_date` if set, else graft_date
- `marking_color` → calculated from birth year
- `source` → `"Distributed from [batch_name]"`
- `status` → `'active'`
- `mated_at_eircode` → mating_location if available

## 4. Post-Task Review
* **Summary of Changes:**
  * Created SECURITY DEFINER RPC function `create_queen_for_distribution` that inserts a queen record bypassing RLS
  * Added `createQueenForRecipient` helper in `useGraftDistributions.ts` that fetches batch/graft data and calls the RPC
  * Integrated into both `createDistribution` (single) and `createBulkDistributions` (bulk) — fires non-blocking after successful distribution to any app user
* **Notes for User:** Please test by distributing a graft to yourself or another app user, then check the recipient's Queens page for the new record.

---

# Task: Lock Distributed Queen Fields and Store Breeder Info
**Date:** 08/03/2026
**Status:** In Progress

## 1. Problem
Queens auto-created via distribution have no provenance info and all fields are editable. Need to:
- Lock birth_date, source, marking_color, mated_at_eircode on distributed queens
- Store and display the breeder (distributor) name and source batch name

## 2. Impact Analysis
* **DB Changes:**
  * Add `distributed_by_name` text column to queens (nullable) — serves as "is distributed" flag + breeder display
  * Update RPC: add `p_batch_id` and `p_distributed_by_name` parameters
* **Files to Modify:**
  * `src/hooks/useGraftDistributions.ts` — fetch user profile name, pass batch_id + name to RPC
  * `src/types/queen.ts` — add `distributed_by_name` to Queen interface
  * `src/app/dashboard/queens/page.tsx` — lock fields + show info when distributed
* **Simplicity Check:** One new DB column, RPC update, hook tweak, and UI conditional disabling. No RLS changes.

## 3. Execution Plan
- [x] **Step 1:** DB migration: add `distributed_by_name` column + update RPC
- [x] **Step 2:** Update hook to fetch profile name and pass batch_id + name to RPC
- [x] **Step 3:** Update Queen type to include `distributed_by_name`
- [x] **Step 4:** Update queen edit form to lock fields and show breeder info
- [ ] **Step 5:** Prompt user to test the build

## 4. Post-Task Review
* **Summary of Changes:**
  * DB migrations: added `distributed_by_name` and `distributed_batch_name` text columns to queens table, updated RPC with `p_batch_id`, `p_distributed_by_name`, and `p_distributed_batch_name` parameters
  * Hook: `useGraftDistributions.ts` now fetches breeder profile name and batch details, passes `batch_id` + `distributed_by_name` + `distributed_batch_name` to RPC
  * Type: added `distributed_by_name` and `distributed_batch_name` to `Queen` interface
  * UI: queen edit form locks birth_date, marking_color, source, mated_at_eircode, and source_batch when `distributed_by_name` is set; source batch shows denormalised batch name as read-only text; breeder info banner shows breeder name and batch provenance
* **Notes for User:** Please test by editing a distributed queen — the five fields should be greyed out and a banner should show the breeder name and batch.

---

# Task: Store Lineage Snapshot for Distributed Queens
**Date:** 09/03/2026
**Status:** In Progress

## 1. Problem
Recipients of distributed queens have no visibility of the breeder's mother queen or drone source. The `mother_id`/`father_id` FKs point to the breeder's queens which RLS blocks. The recipient sees an empty lineage.

## 2. Impact Analysis
* **DB Changes:**
  * Add `distributed_mother_queen` text column — snapshot e.g. "Queen #5 (Blue 2025, AMM)"
  * Add `distributed_drone_source` text column — e.g. "Open-mated at Mating Apiary (H91 E6K2)"
  * Update RPC with `p_distributed_mother_queen`, `p_distributed_drone_source`, `p_subspecies`, `p_lineage`
* **Files to Modify:**
  * `src/hooks/useGraftDistributions.ts` — join mother queen via batch, build snapshots
  * `src/types/queen.ts` — add new fields to Queen interface
  * `src/app/dashboard/queens/page.tsx` — show lineage fields in breeder banner
* **Simplicity Check:** Two new columns, RPC update, one extra join in the hook, banner update. No new UI components.

## 3. Execution Plan
- [x] **Step 1:** DB migration: add columns + update RPC (manual — MCP unavailable)
- [x] **Step 2:** Update hook to join mother queen via batch and build snapshot strings
- [x] **Step 3:** Update Queen type
- [x] **Step 4:** Update breeder info banner to display mother queen and drone source
- [ ] **Step 5:** Prompt user to test the build

## 4. Post-Task Review
* **Summary of Changes:**
  * DB migration: added `distributed_mother_queen` and `distributed_drone_source` text columns to queens, updated RPC with `p_distributed_mother_queen`, `p_distributed_drone_source`, `p_subspecies`, `p_lineage`
  * Hook: batch query now joins `queens!mother_queen_id` and fetches apiary `name`. Builds mother queen snapshot (e.g. "Queen #5 (Blue 2025, AMM)"), drone source description (e.g. "Open-mated at Apiary Name (H91 E6K2)"), and human-readable lineage summary. Also sets subspecies from mother queen.
  * Type: added `distributed_mother_queen` and `distributed_drone_source` to Queen interface
  * UI: breeder info banner now shows mother queen and drone source alongside breeder name and batch
* **Notes for User:** Please run the SQL migration manually in the Supabase dashboard, then test by distributing a queen and checking the recipient's queen edit form.

---

# Task: Harden Records Inspection Data Flow
**Date:** 08/03/2026
**Status:** Completed

## 1. Objective
Harden the Records inspection create flow so loading state, previous-inspection prefill, and form initialisation remain deterministic under partial data, failed requests, and same-day inspection history.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/hooks/useRecordsData.ts`
  * `src/app/dashboard/records/page.tsx`
  * `src/components/records/forms/InspectionForm.tsx`
  * `docs/features/records-inspection-hardening-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** Keep this to a surgical hardening pass inside the existing records page and hook. No schema changes, no new API surface, and no broader refactor of unrelated record forms.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Remove child-level loading toggles from `src/hooks/useRecordsData.ts`, make `fetchAllData()` the sole owner of global records loading state, and harden inspection fetch error handling so failed requests clear stale data instead of leaving mixed state behind.
- [x] **Step 2:** Replace the partial `Inspection` cast in `src/app/dashboard/records/page.tsx` with a proper new-inspection `InspectionFormData` draft path so create flows no longer rely on invalid domain objects.
- [x] **Step 3:** Update latest-inspection ordering and right-sized prefill tracking across `src/hooks/useRecordsData.ts` and `src/components/records/forms/InspectionForm.tsx` so same-day inspections resolve deterministically and late-arriving history can still populate the new form.
- [x] **Step 4:** Update documentation in `docs/features/records-inspection-hardening-plan.md`
- [x] **Step 5:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The records page mixed page-level loading ownership with child fetch completion, and the new-inspection flow relied on a forged partial `Inspection` object. That combination left the form vulnerable to partial data, stale state after inspection fetch failures, and missed right-sized prefills when history arrived after the hive context was already set.
* **Summary of Changes:** Consolidated inspection loading completion under `fetchAllData()`, cleared stale inspections on fetch errors, replaced the create-flow partial `Inspection` cast with a proper `InspectionFormData` draft, and hardened right-sized prefills so they re-evaluate when the resolved previous value changes.
* **Notes for User:** No build or automated test run was performed, per project instruction. Please manually verify the Records page and new/edit inspection flows.

## Review

- Data loading: `src/hooks/useRecordsData.ts` no longer lets `fetchInspections()` finish the global records loading cycle early, and inspection fetch errors now clear stale inspection rows before returning.
- Create-flow state: `src/app/dashboard/records/page.tsx` now uses a dedicated `InspectionFormData` draft for new inspections and memoises the form input model so parent re-renders do not recreate inspection initial data unnecessarily.
- Prefill behaviour: `src/components/records/forms/InspectionForm.tsx` now keys right-sized prefills by both hive and resolved historical value, allowing late-arriving inspection history to populate the field once without repeatedly overriding the same hive context.

---

# Task: Normalise Image URLs for Batches & Public Traceability Page
**Date:** 09/03/2026
**Status:** In Progress

## 1. Problem
Apiary image URLs in the Traceability Tool (honey provenance) and the public Honey Trace page are not normalised. Legacy absolute Supabase storage URLs from previous projects break `next/image` in offline/local development and after project migrations.

This was already fixed for inspections/records and apiaries (see `docs/features/offline-storage-url-normalisation-plan.md` and `docs/features/offline-apiary-image-url-normalisation-plan.md`). The same `normaliseStoragePublicUrl` from `src/lib/storage-url.ts` needs applying to the two remaining image paths.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/components/tools/TraceabilityTool.tsx` — normalise `apiaryImageUrl` at fetch time (line ~214)
  * `src/app/(trace)/trace/[batchCode]/page.tsx` — normalise `apiary_image_url` before render (line ~158)
  * `docs/features/batch-traceability-image-url-normalisation-plan.md` — new feature doc
  * `tasks/todo.md`
* **Simplicity Check:** Two single-line `normaliseStoragePublicUrl()` calls at existing image URL assignment points. No database changes, no component restructuring, no new dependencies.

## 3. Execution Plan
- [x] **Step 1:** In `TraceabilityTool.tsx`: import `normaliseStoragePublicUrl` and wrap the `apiaryImageUrl` assignment (line ~214) so the stored URL is normalised at fetch time.
- [x] **Step 2:** In `trace/[batchCode]/page.tsx`: import `normaliseStoragePublicUrl` and normalise `apiary_image_url` after the RPC response before it reaches the `<Image>` component.
- [x] **Step 3:** Create feature doc `docs/features/batch-traceability-image-url-normalisation-plan.md`.
- [ ] **Step 4:** Prompt user to test the build.

## 4. Post-Task Review
* **Summary of Changes:** Applied the existing `normaliseStoragePublicUrl` helper to two files — the Traceability Tool's apiary image fetch and the public trace page's RPC response — so legacy Supabase storage URLs are rewritten to the current origin before rendering.
* **Notes for User:** Please test by viewing a batch preview with an apiary image in the Traceability Tool, and visiting a public trace page that has an apiary image.

---

# Task: DCA Field Confirmation — Feedback Loop for Prediction Improvement
**Date:** 10/03/2026
**Status:** In Progress

## 1. Objective
Add a confirm/deny mechanism to DCA predictions so beekeepers can record field observations ("drones seen" or "no drones"), feeding real-world data back into scoring.

## 2. Impact Analysis
* **DB Changes:** New `dca_confirmations` table with user-scoped RLS
* **Files Modified:**
  * `src/hooks/useDCAPredictions.ts` — fetch confirmations, apply +/-15 score adjustment, expose `confirmDCA()`
  * `src/app/dashboard/community-map/page.tsx` — popup buttons, marker colour logic, global callback, legend
  * `docs/features/dca-prediction.md` — field confirmation documentation

## 3. Execution Plan
- [x] **Step 1:** Create `dca_confirmations` DB table with RLS via MCP migration
- [x] **Step 2:** Update hook — add DCAConfirmation type, fetch on mount, apply score adjustments, add `confirmDCA()` function
- [x] **Step 3:** Update community map — popup buttons, marker colours (green/grey/rose), global callback, legend entry
- [x] **Step 4:** Update documentation with field confirmation section
- [ ] **Step 5:** Prompt user to test the build

## 4. Post-Task Review
* **Summary of Changes:**
  * DB: Created `dca_confirmations` table with indexes and standard user-scoped RLS policies
  * Hook: Fetches confirmations on mount, applies +/-15 score adjustment post-prediction (clamped 0-100, filtered at 40), exposes `confirmDCA()` that inserts row and clears prediction cache
  * Map: Unconfirmed popups show "Drones seen" / "No drones" buttons via `window.__dcaConfirm` global callback; confirmed markers are green (#059669), denied are grey (#9ca3af); circle fill/outline uses data-driven colour; legend shows confirmed DCA entry
  * Docs: Added field confirmation section covering scoring impact, visual indicators, and privacy
* **Notes for User:** Please test by running a DCA prediction, clicking a marker to confirm/deny, and verifying marker colour changes on recalculation.

---

# Task: DCA Candidate Injection — Field-Confirmed Locations Feed Into Prediction Engine
**Date:** 10/03/2026
**Status:** In Progress

## 1. Objective
Inject positive field confirmations as new candidates into the DCA prediction engine so field-verified locations appear in future predictions even when terrain analysis alone wouldn't find them.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/lib/dca-prediction.ts` — accept optional confirmations param, inject as candidates after terrain generation
  * `src/hooks/useDCAPredictions.ts` — pass confirmations into `predictDCAs()`
  * `docs/features/dca-prediction.md` — document candidate injection behaviour
* **Simplicity Check:** One new optional parameter, one injection loop in the engine, one call-site change in the hook, and a docs update. No DB changes, no UI changes, no new files.

## 3. Execution Plan
- [x] **Step 1:** Add `ConfirmedLocation` interface and update `predictDCAs` signature to accept optional confirmations
- [x] **Step 2:** After terrain candidate generation (Step 3), inject positive confirmations not within 1km of any terrain candidate — compute nearest apiary and direction index
- [x] **Step 3:** Update hook to pass confirmations into `predictDCAs()`
- [x] **Step 4:** Update `docs/features/dca-prediction.md` with candidate injection documentation
- [ ] **Step 5:** Prompt user to test the build

## 4. Post-Task Review
* **Summary of Changes:**
  * Engine (`dca-prediction.ts`): Added `ConfirmedLocation` export interface, updated `predictDCAs` to accept optional `confirmedLocations` param. After terrain candidate generation (Step 3), positive confirmations not within 1km of any terrain candidate are injected into `allCandidates` with the nearest apiary's ID/name and a computed direction index from bearing. They then flow through normal bowl/donut/convergence scoring.
  * Hook (`useDCAPredictions.ts`): Maps `confirmationsRef.current` to `ConfirmedLocation[]` and passes it to `predictDCAs()`. Cache key unchanged — cache is already cleared on confirmation.
  * Docs (`dca-prediction.md`): Added "Candidate Injection" subsection under Field Confirmation documenting the injection flow, skip logic, and scoring behaviour.
* **Notes for User:** Please test by adding a positive confirmation at a location with no nearby DCA prediction, then recalculating — the confirmed location should appear as a new predicted DCA.

---

# Task: Fix Wolf Scale Bracket Values Missing Maintenance Event Subtraction
**Date:** 12/03/2026
**Status:** In Progress

## 1. Problem
The 30d bracket values on Wolf scale cards show **positive** numbers that don't make sense:
- Hive #26-DA: -3.17 30d **(+2.39)** ← should be negative
- Hive #64-DA: -4.94 30d **(+0.90)** ← should be negative

### Root Cause
In `src/app/api/wolf-waagen/data/route.ts`, the **current period** weight changes correctly subtract maintenance events (feeding/harvesting) via `detectMaintenanceEvents` + `sumInterventions`. But the **previous period** bracket values (lines 189-192) use raw `calcWeightChange` with **no maintenance subtraction**, so feeding events in the prior 30-60 day window inflate the value and make it appear positive.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/app/api/wolf-waagen/data/route.ts` — apply maintenance event detection to previous period 7d and 30d values
* **Simplicity Check:** Three lines of code added. Same pattern already used for current period values. No UI changes, no DB changes.

## 3. Execution Plan
- [x] **Step 1:** Apply `detectMaintenanceEvents` + `sumInterventions` to `historyPrev7d` and `historyPrev30d` in the Wolf API route, matching the existing current-period logic
- [ ] **Step 2:** Prompt user to test the build

## 4. Post-Task Review
* **Root Cause Found:** Previous period bracket values in the Wolf API route used raw `calcWeightChange` without subtracting maintenance events (feeding/harvesting), while current period values correctly subtracted them. This made bracket values appear inflated/positive when feeding occurred in the prior period.
* **Summary of Changes:** Applied `detectMaintenanceEvents` + `sumInterventions` to `historyPrev7d` and `historyPrev30d` in `src/app/api/wolf-waagen/data/route.ts` (lines 189-200), matching the existing pattern used for current period values. The 24h previous period is unchanged as it only has ~1 daily reading (not enough for maintenance detection).
* **Notes for User:** Please test by refreshing the Scale Overview page and checking the Wolf scale bracket values for 7d and 30d.

---

# Task: Fix Virgin Queen Tracker Mated Status for Mated Queen Distributions
**Date:** 12/03/2026
**Status:** In Progress

## 1. Problem
Cells #8, #9, #10 in the Virgin Queen Tracker show "Pending" in the Mated column, but in the Grafting Batch distributions they are marked as "Mated Queen" distribution type. The tracker only checks the `mating_confirmed` boolean (which defaults to `false`) and ignores `distribution_type === 'mated_queen'`.

### Root Cause
- When creating a distribution with `distribution_type = 'mated_queen'`, the code never sets `mating_confirmed = true` — it uses the DB default of `false`
- The Virgin Queen Tracker UI, stats, and filters only check `mating_confirmed`, not `distribution_type`
- The NIHBS report already handles this correctly (`mating_confirmed OR distribution_type = 'mated_queen'`)

## 2. Impact Analysis
* **Files to Modify:**
  * `src/hooks/useVirginQueenTracker.ts` — stats and filter logic
  * `src/components/batches/VirginQueenTrackerTab.tsx` — Mated column display
  * `src/hooks/useGraftDistributions.ts` — auto-set mating_confirmed on mated_queen distributions
  * Database — fix existing mated_queen distributions with mating_confirmed = false
* **Simplicity Check:** Three small code changes + one data fix. No new files, no UI redesign.

## 3. Execution Plan
- [x] 1. Fix `useVirginQueenTracker.ts` — update `calculateStats` and `filterByStatus` to treat `mated_queen` distributions as mated
- [x] 2. Fix `VirginQueenTrackerTab.tsx` — update Mated column display (desktop + mobile)
- [x] 3. Fix `useGraftDistributions.ts` — auto-set `mating_confirmed = true` when creating `mated_queen` distributions (single + bulk)
- [x] 4. Fix existing data — updated 3 rows in `graft_distributions` where `distribution_type = 'mated_queen'` and `mating_confirmed = false`
- [x] 5. Update feature documentation
- [ ] 6. Prompt user to test

## 4. Post-Task Review
* **Root Cause:** When creating a `mated_queen` distribution, the code never set `mating_confirmed = true` — it used the DB default of `false`. The Virgin Queen Tracker UI, stats, and filters only checked `mating_confirmed`, ignoring `distribution_type`.
* **Summary of Changes:**
  * `useVirginQueenTracker.ts`: `calculateStats` and `filterByStatus` now treat `distribution_type === 'mated_queen'` as effectively mated (matching NIHBS report logic)
  * `VirginQueenTrackerTab.tsx`: Desktop table and mobile card Mated column now show "Yes" for mated queen distributions
  * `useGraftDistributions.ts`: Both `createDistribution` and `createBulkDistributions` now auto-set `mating_confirmed = true` and `mating_confirmed_date` when `distribution_type === 'mated_queen'`
  * Database: Fixed 3 existing rows with `mating_confirmed = false` for `mated_queen` distributions
  * Documentation: Updated `docs/features/virgin-queen-tracker.md` with mated status logic
* **Notes for User:** Please test by viewing the Virgin Queen Tracker tab — cells #8, #9, #10 should now show "Yes" in the Mated column and the Mated count should increase to 5.

---

# Task: Make Mating Location Mandatory for All Distribution Types
**Date:** 12/03/2026
**Status:** Complete

## 1. Problem
The DistributeGraftModal only showed and required the mating location field for `queen_cell` distributions. For `virgin_queen` and `mated_queen` types, the field was hidden entirely, so no location was captured. This caused cells #8, #9, #10 to have no mating location in the Virgin Queen Tracker.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/components/batches/DistributeGraftModal.tsx` — show/require mating location for all types
  * `docs/features/batch-distributions.md` — update documentation
* **Simplicity Check:** Four small edits in one file. No new files, no DB changes.

## 3. Execution Plan
- [x] 1. Show mating location field for all distribution types (not just queen_cell) for app users
- [x] 2. Require either apiary or mating location for all types (not just queen_cell)
- [x] 3. Require external location for all types (not just queen_cell)
- [x] 4. Update batch-distributions.md documentation

## 4. Post-Task Review
* **Root Cause:** The mating location input was conditionally shown only for `distributionType === 'queen_cell'`, and the validation check had the same guard. External location was also only required for queen_cell.
* **Summary of Changes:**
  * Removed `distributionType === 'queen_cell'` guards from the mating location field visibility, the app-user validation, and the external location requirement
  * External location asterisk now always shown (was conditional on queen_cell)
  * Updated `docs/features/batch-distributions.md`
* **Notes for User:** Please test by opening the distribute modal for a virgin queen or mated queen — the mating location field should now appear and be required.

---

# Task: Queen Rearing Code Audit — Application Hardening
**Date:** 12/03/2026
**Status:** In Progress

## 1. Objective
Principal Quality Architect audit of the queen rearing, distribution, and virgin queen tracking code. Focus on robustness, defensive programming, and correctness. Application code hardening only — no test code.

## 2. Files Audited
- `src/hooks/useBatchGrafts.ts` (647 lines)
- `src/hooks/useGraftDistributions.ts` (601 lines)
- `src/hooks/useVirginQueenTracker.ts` (283 lines)
- `src/components/batches/DistributeGraftModal.tsx` (570 lines)
- `src/components/batches/BatchGraftsSection.tsx` (207 lines)
- `src/components/batches/QueenTrackingSection.tsx` (491 lines)
- `src/components/batches/DistributionList.tsx` (239 lines)
- `src/components/batches/VirginQueenTrackerTab.tsx` (481 lines)

## 3. Findings

### HIGH Severity

**H1 — Stale closure in concurrent update guard**
`VirginQueenTrackerTab.tsx:135-155` — `handleOverwinteredChange` and `handleHybridisationChange` include `updatingIds` (a state Set) in their `useCallback` dependency arrays. The `if (updatingIds.has(id)) return` check reads a stale closure value. If two rapid clicks occur before React re-renders, the second click bypasses the guard. Should use a ref instead.

**H2 — Optimistic updates not reverted on failure**
`useBatchGrafts.ts:235-275` — `updateGraftQueenMarked`, `updateGraftStatusDate`, and `updateGraftQueenNumber` optimistically update local state via `setGrafts(prev => ...)` but never revert on Supabase error. The user sees the UI reflect a change that didn't persist.

**H3 — `queens_mated` counter counts all `sold` grafts regardless of distribution type**
`useBatchGrafts.ts:154` — Grafts distributed as `queen_cell` (unmated) are counted in `queens_mated` because they have `sold` status. The batch-level counters shown in the UI could mislead.

**H4 — Dead code: unused `toggleMatingConfirmed` export**
`useGraftDistributions.ts:460-477` — Exported but never called by any consumer. Superseded by `confirmMatingWithLocation` and `clearMatingConfirmation`.

### MEDIUM Severity

**M1 — `deriveBirthDate` timezone-unsafe**
`useGraftDistributions.ts:106` — Uses `new Date(batch.graft_date)` without the `T00:00:00` suffix that every other date parse in the codebase uses. Could shift dates by a day in negative UTC offsets.

**M2 — `formatDateIrish` duplicated**
`VirginQueenTrackerTab.tsx:14-22` — Duplicates the same function from `graftConstants.ts`. Import it instead.

**M3 — No input length limits on external recipient fields**
`DistributeGraftModal.tsx:423-461` — Name, email, phone, and location inputs have no `maxLength`. Users could submit arbitrarily long strings.

**M4 — O(n*m) graft lookup in render loops**
`DistributionList.tsx:73,151` — `grafts.find()` inside `.map()` for each distribution. Should use a `Map` for O(1) lookup.

**M5 — `handleBulkDelete` (frame) doesn't exclude distributed grafts**
`useBatchGrafts.ts:445-463` — Frame bulk delete could attempt to delete grafts with FK-linked distributions, resulting in a confusing DB error instead of a clear message.

**M6 — `updateGraftStatus` doesn't validate against known statuses**
`useBatchGrafts.ts:201-215` — Accepts any string as `newStatus`. Should validate against `GRAFT_STATUSES`.

## 4. Execution Plan

- [x] **H1:** Replace `updatingIds` state check with a `useRef<Set<string>>` for the concurrent update guard
- [x] **H2:** Add error rollback to optimistic updates in `useBatchGrafts.ts`
- [x] **H3:** Fix `queens_mated` counter to exclude `sold` grafts distributed as `queen_cell`
- [x] **H4:** Remove dead `toggleMatingConfirmed` function and its export
- [x] **M1:** Add `T00:00:00` suffix to date parse in `deriveBirthDate`
- [x] **M2:** Import `formatDateIrish` from `graftConstants` instead of duplicating
- [x] **M3:** Add `maxLength` attributes to external recipient inputs
- [x] **M4:** Convert graft lookup to `Map` in `DistributionList.tsx`
- [x] **M5:** Filter out distributed/failed grafts before frame bulk delete
- [x] **M6:** Validate status value in `updateGraftStatus`
- [x] Update `docs/features/batch-distributions.md` with hardening notes
- [ ] Prompt user to test

## 5. Post-Task Review
* **Summary of Changes:**
  * `VirginQueenTrackerTab.tsx`: Replaced stale closure guard with `useRef` for concurrent update protection; imported `formatDateIrish` from `graftConstants` instead of duplicating
  * `useBatchGrafts.ts`: Added optimistic update rollback on failure for queen marked/status date/queen number; fixed `queens_mated` counter to exclude queen_cell distributions; added status validation against known values; hardened frame bulk delete to exclude distributed/failed grafts
  * `useGraftDistributions.ts`: Removed dead `toggleMatingConfirmed` function; fixed timezone-unsafe date parse in `deriveBirthDate`
  * `DistributeGraftModal.tsx`: Added `maxLength` to all external recipient text inputs
  * `DistributionList.tsx`: Replaced O(n*m) `Array.find()` with O(1) `Map` lookup
  * `docs/features/batch-distributions.md`: Added code hardening section for 12/03/2026
* **Notes for User:** Please test the batch management, distribution, and virgin queen tracker flows.

---

# Task: Distribution Table UX Improvements
**Date:** 12/03/2026
**Status:** In Progress

## 1. Objective
Improve the Distributions table with better column labelling, recipient colour-coding by type, and sortable Date/Mated columns.

## 2. Changes Required

### Column Header: Cell / Queen
- Rename "Cell" header to "Cell / Queen" since it already shows queen number below cell number

### Recipient Colour-Coding
- **Group member** (green dot/badge) — `recipient_user_id` is in `groupMemberIds`
- **App user** (blue dot/badge) — `recipient_user_id` is set but not in group
- **Other beekeeper** (amber dot/badge) — `recipient_user_id` is null (external)
- Add a compact legend row below the collapse toggle
- Need to pass `groupMemberIds` from `BatchGraftsSection` → `DistributionList`

### Sortable Columns: Date & Mated
- Add sort state (`sortBy: 'date' | 'mated'`, `sortDir: 'asc' | 'desc'`)
- Clickable headers with sort indicator arrows
- Sort distributions via `useMemo` based on sort state

## 3. Impact Analysis
* **Files to Modify:**
  * `src/components/batches/DistributionList.tsx` — all changes
  * `src/components/batches/BatchGraftsSection.tsx` — pass `groupMemberIds` prop
* **Simplicity Check:** All changes in one component + one prop pass-through. No DB changes, no hook changes.

## 4. Execution Plan
- [x] **Step 1:** Add `groupMemberIds` prop and pass it from `BatchGraftsSection`
- [x] **Step 2:** Rename Cell header to "Cell / Queen"
- [x] **Step 3:** Add recipient type helper + colour-coded dot on recipient names (desktop + mobile)
- [x] **Step 4:** Add compact legend below the collapse toggle
- [x] **Step 5:** Add sort state + sortable Date and Mated column headers with indicators
- [x] **Step 6:** Sort distributions via `useMemo`
- [x] **Step 7:** Update `docs/features/batch-distributions.md`
- [ ] Prompt user to test
