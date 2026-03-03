# Task: Mark Queen from Nuc Inspection Panel
**Date:** 03/03/2026
**Status:** Complete — awaiting user testing

## 1. Objective
Allow users to mark queens directly from the mating nuc view. Adds a "Mark Queen" button beside "Add Inspection" that updates both the nuc card (with marked date) and the batch graft record (`queen_marked`, `queen_number`).

## 2. Execution Plan
- [x] **Step 1:** Run migration — add `queen_marked_at` column to `mating_nucs` table
- [x] **Step 2:** Update `MatingNucsTab.tsx` — expand MatingNuc interface & fetch queries to include `queen_marked`, `queen_number`, `emergence_date`, and `queen_marked_at`
- [x] **Step 3:** Update `MatingNucsTab.tsx` — pass `emergenceDate` prop to `NucInspectionPanel`
- [x] **Step 4:** Update `MatingNucsTab.tsx` — display "Marked" date + colour dot on nuc card when `queen_marked_at` is set
- [x] **Step 5:** Update `NucInspectionPanel.tsx` — add `emergenceDate` prop, "Mark Queen" button, inline mark form, and `handleMarkQueen` save function
- [x] **Step 6:** Update feature documentation in `docs/features/mark-queen-from-nuc.md`
- [ ] **Step 7:** User testing

## 3. Post-Task Review
* **Summary of Changes:**
  - **Migration:** Added `queen_marked_at` (timestamptz) to `mating_nucs`.
  - **MatingNucsTab.tsx:** Expanded `MatingNuc` interface with `queen_marked_at`, plus `queen_marked`/`queen_number` on `batch_grafts` sub-type and `emergence_date` on `rearing_batches` sub-type. Updated both fetch queries to include new fields. Passed `emergenceDate` prop to `NucInspectionPanel`. Added colour dot + "Marked: date (#number)" display on nuc card.
  - **NucInspectionPanel.tsx:** Added `emergenceDate` prop. Added `showMarkForm`/`markQueenNumber` state. Added "Mark Queen" button (only visible when graftId is present). Added inline mark form with auto-determined colour dot and optional queen number input. `handleMarkQueen` updates `batch_grafts` and `mating_nucs` then refreshes via `onInspectionChange`.
  - **Docs:** Created `docs/features/mark-queen-from-nuc.md`.
* **Scope:** 2 component files, 1 migration, 1 doc file. No new dependencies. Reused existing `getQueenColorFromYear` and `COLOUR_DOTS` utilities.
