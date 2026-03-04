# Task: Queen Cell Distributions Counted by Wrong Month
**Date:** 04/03/2026
**Status:** Completed

## 1. Objective
The NIHBS Excel export shows 6 sealed queen cells distributed in February, but only 4 were actually distributed in February (Cells #1, #2, #6, #7). Cells #3 and #4 were distributed on 04/03/2026 (March). The report should count queen_cell distributions by `distribution_date` month, not by batch emergence month.

## 2. Root Cause
- `useNIHBSReport.ts` counts all queen_cell distributions per batch, then assigns the total to the batch's emergence month — ignoring the actual `distribution_date`
- `useRearingGroupReport.ts` counts all queen_cell distributions from batches in the selected month, without filtering by `distribution_date` — same bug

## 3. Impact Analysis
* **Files Modified:**
  * `src/hooks/useNIHBSReport.ts` — count queen_cell distributions by distribution_date month
  * `src/hooks/useRearingGroupReport.ts` — add distribution_date to select, filter by month range

## 4. Execution Plan
- [x] **Step 1:** In `useNIHBSReport.ts`, replace per-batch queen_cell counting with per-distribution counting using `distribution_date` month
- [x] **Step 2:** In `useRearingGroupReport.ts`, add `distribution_date` to the select and filter queen_cell counts by the selected month range
- [x] **Step 3:** Update documentation
- [x] **Step 4:** Prompt user to test

## 5. Post-Task Review
* **Root Cause:** Queen cell distributions were counted per-batch and assigned to the batch's emergence month. Distributions happening in later months were incorrectly attributed to the batch month.
* **Fix:** Both hooks now use each distribution's `distribution_date` to determine which month it belongs to.
* **Changes:**
  1. `useNIHBSReport.ts` — iterate individual queen_cell distributions, parse `distribution_date`, assign to correct month (still uses batch's mating apiary for per-apiary breakdown)
  2. `useRearingGroupReport.ts` — added `distribution_date` to select, filter queen_cell count by `startDate`/`endDate` range
  3. Updated nihbs-monthly-returns.md and batch-distributions.md
