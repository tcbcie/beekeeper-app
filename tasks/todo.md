# Task: Auto-sync nuc status and graft status from inspection queen_status
**Date:** 03/03/2026
**Status:** Completed

## 1. Objective
When a nuc inspection is saved with a `queen_status`, auto-update the nuc and linked batch graft status accordingly. Currently only `laying` and `dead/missing` trigger nuc updates, and graft status is never synced.

## 2. Impact Analysis
* **Files to Modify:** `NucInspectionPanel.tsx` (add graftId prop + expand status logic), `MatingNucsTab.tsx` (pass graftId prop)
* **No database migration needed** — all columns and statuses already exist.

## 3. Execution Plan
- [x] **Step 1:** Add `graftId` prop to `NucInspectionPanel` interface and component signature
- [x] **Step 2:** Expand the auto-status block in `handleSubmit` to handle `virgin`, `mated`, `laying` with graft updates
- [x] **Step 3:** Pass `graftId` from `MatingNucsTab` to `NucInspectionPanel`
- [x] **Step 4:** Create feature documentation in `docs/features/`
- [ ] **Step 5:** Prompt user to test

## 4. Post-Task Review
* **Summary of Changes:**
  - `NucInspectionPanel.tsx` — Added optional `graftId` prop. Replaced the 2-branch `if/else` auto-status block with a 4-branch mapping (`virgin`→nuc `virgin` + graft `emerged`, `mated`→nuc `mating` + graft `mated`, `laying`→nuc `laying` + graft `mated`, `dead/missing`→nuc `failed`). Sets `queen_emerged_at` or `mating_confirmed_at` on the nuc as appropriate.
  - `MatingNucsTab.tsx` — Added `graftId={nuc.graft_id}` to the `NucInspectionPanel` render call (1 line).
  - Created `docs/features/nuc-inspection-status-sync.md`.
* **Scope:** 2 component files touched, ~20 lines changed. No database migration. No new dependencies.
