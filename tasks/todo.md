# NIHBS Report: Track Mated Queen Distributions

## Problem
Mated queen distributions (from nuc cards) are correctly stored in `graft_distributions` but completely ignored by the NIHBS report hook. Line 219 of `useNIHBSReport.ts` skips any distribution that isn't `virgin_queen`.

## Affected Distributions (March 2026 test data)
- 1 mated queen to external beekeeper → NOT shown
- 1 mated queen to app user (non-member) → NOT shown
- 2 mated queens to group members → NOT shown
- 4 sealed cells → correctly shown on row 28

## Plan

- [x] 1. **useNIHBSReport.ts** — Add mated queen distribution tracking
  - Add `mated_distributed_external` and `mated_distributed_internal` fields to `MonthlyData`
  - Initialise to 0 in `getMonth` helper
  - Add processing loop for `mated_queen` type distributions (separate from existing virgin_queen loop)
  - External = recipient is null OR not a group member
  - Internal = recipient is a group member

- [x] 2. **NIHBSMonthlyReturn.tsx — Desktop table** — Add display rows
  - New row 30: "Mated queens distributed outside group" (auto-calculated, read-only)
  - New row 32: "Mated queens distributed to group members" (auto-calculated, read-only)

- [x] 3. **NIHBSMonthlyReturn.tsx — Mobile card view** — Add display rows
  - Same two new metrics as desktop

- [x] 4. **NIHBSMonthlyReturn.tsx — Excel export** — Add export rows
  - Row 30: Mated queens distributed outside group (after row 28)
  - Row 32: Mated queens distributed to group members

- [ ] 5. **Test** — User to verify report and Excel reflect all distributions

## Review

### Summary of Changes
**2 files changed, no migrations, no new dependencies.**

**`src/hooks/useNIHBSReport.ts`:**
- Added `mated_distributed_external` and `mated_distributed_internal` to `MonthlyData` interface
- Initialised both to 0 in the `getMonth` helper and the manual-only month creation block
- Added a new processing loop for `mated_queen` distributions:
  - If recipient is a group member → increments `mated_distributed_internal`
  - If recipient is null (external beekeeper) or not a group member → increments `mated_distributed_external`

**`src/components/rearing-groups/NIHBSMonthlyReturn.tsx`:**
- Desktop table: Added 2 new read-only rows (green highlight) after row 28 — row 30 (external) and row 32 (internal)
- Mobile card view: Added 2 new metric lines after "Sealed cells distributed"
- Excel export: Added rows 30 and 32 with yellow fill and borders after the sealed cells row

**`docs/features/nihbs-monthly-returns.md`:** Updated to document new rows.

### Expected Results for March 2026
- Row 28: Sealed queen cells distributed = 4
- Row 30: Mated queens distributed outside group = 2 (1 external beekeeper + 1 non-member app user)
- Row 32: Mated queens distributed to group members = 2
