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
