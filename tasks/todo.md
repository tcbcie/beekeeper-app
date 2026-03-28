# Task: Recalculate Nuc Status After Inspection Deletion

**Date:** 28/03/2026
**Status:** Complete

## Objective
When inspection records are deleted, recalculate the nuc's derived fields (status, queen_emerged_at, mating_confirmed_at, queen_last_seen_at, failed_at) and graft status from remaining inspections.

## Plan

- [x] 1. After deleting an inspection, fetch remaining inspections for the nuc
- [x] 2. Replay inspection logic chronologically to compute correct nuc state
- [x] 3. Update nuc record with recalculated fields (or reset to defaults if no inspections remain)
- [x] 4. Recalculate graft status if applicable

## Review

### Changes Made

- **`src/components/batches/NucInspectionPanel.tsx`** — `handleDelete`
  - After deleting the inspection, fetches all remaining inspections ordered chronologically
  - Replays the same queen_status → nuc field logic used in `handleSubmit` to compute the correct state
  - Preserves earliest milestone dates (queen_emerged_at, mating_confirmed_at) and latest sighting dates (queen_last_seen_at)
  - If no inspections remain, resets nuc to `status: 'setup'` and clears all date fields
  - Also recalculates the linked graft status (or resets to `'in_nuc'` if no queen status inspections remain)
