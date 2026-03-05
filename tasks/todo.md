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
