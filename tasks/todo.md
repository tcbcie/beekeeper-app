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
