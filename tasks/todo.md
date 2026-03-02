# Task: Match Sealed Cell Distribution to Virgin Queen Distribution
**Date:** 02/03/2026
**Status:** Complete

## 1. Objective
Show the Recipient's Apiary dropdown when distributing sealed cells (queen_cell type), matching the behaviour already available for virgin_queen and mated_queen distributions.

## 2. Execution Plan

- [x] Update apiary dropdown condition in `DistributeGraftModal.tsx` line 459 to include `queen_cell`
- [x] Verify `DistributionList.tsx` displays apiary details for `queen_cell` (confirmed — no type filter needed)
- [x] Create/update feature doc in `docs/features/batch-distributions.md`
- [ ] User tests the build

## 3. Post-Task Review

**Summary of Changes:**
- `src/components/batches/DistributeGraftModal.tsx` — Added `'queen_cell'` to the condition on line 459 that controls visibility of the Recipient's Apiary dropdown. Previously only `virgin_queen` and `mated_queen` showed the dropdown; now `queen_cell` does too.
- `docs/features/batch-distributions.md` — Updated the modal field description to reflect that the apiary dropdown is now shown for all three distribution types.

**No change needed in `DistributionList.tsx`** — it already displays apiary/location details for all distribution types without any type-based filtering.

**Impact:** 1 line of logic changed. No schema, API, or other component changes.
