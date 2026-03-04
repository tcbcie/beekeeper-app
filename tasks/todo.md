# Task: Nuc "Dead" Status — Missing Date Display and Graft Sync
**Date:** 04/03/2026
**Status:** In Progress

## 1. Objective
When a nuc inspection sets Queen Status to "Dead":
1. The nuc card should show "Dead: 08/03/2026" like other status dates (Emerged, Mated, etc.)
2. The linked batch graft should update to "Failed" with the inspection date

## 2. Root Cause
In `NucInspectionPanel.tsx` (line 176-178), the dead/missing case only sets `nucUpdate.status = 'failed'` but:
- Does NOT set any date field on the nuc (no `failed_at` column exists)
- Does NOT set `graftStatus`, so the graft sync block (line 189) is skipped entirely

## 3. Impact Analysis
* **Files Modified:**
  * `NucInspectionPanel.tsx` — set `failed_at` + sync graft to "failed"
  * `MatingNucsTab.tsx` — display "Dead: date" in nuc card
* **Migration:** Add `failed_at` column to `mating_nucs`

## 4. Execution Plan
- [x] **Step 1:** Apply migration — add `failed_at` (timestamptz, nullable) to `mating_nucs`
- [x] **Step 2:** In `NucInspectionPanel.tsx`, set `nucUpdate.failed_at = inspectionDate` and `graftStatus = 'failed'` for dead/missing
- [x] **Step 3:** In `MatingNucsTab.tsx`, display "Dead: date" when `nuc.failed_at` is set
- [ ] **Step 4:** Prompt user to test
