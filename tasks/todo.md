# Batch Rearing Group Toggle

## Tasks

- [x] Step 1: Add `rearing_group_id` column to `rearing_batches` table (FK to `rearing_groups`, nullable)
- [x] Step 2: Add rearing group state to batches page (import `useRearingGroups`, fetch groups, add `rearing_group_id` to form/interfaces)
- [x] Step 3: Add "Group Batch" toggle and group selector to the batch form (conditionally show mating apiary section)
- [x] Step 4: Wire `rearing_group_id` into submit and edit logic
- [x] Step 5: Update feature documentation

## Review

### Summary of Changes

**Database:** Added nullable `rearing_group_id` column to `rearing_batches` with FK to `rearing_groups` (ON DELETE SET NULL).

**Batches page:** Imported `useRearingGroups` hook, fetches user's rearing groups on load. Added `rearing_group_id` to `Batch` interface, `FormData` interface, initial form state, submit payload, edit handler, and reset handler.

**Group Batch toggle:** When user belongs to rearing group(s), a toggle appears in the batch form. Toggle ON links the batch to a group and shows the mating apiary section. Toggle OFF clears both `rearing_group_id` and `mating_apiary_id`. If user is in 2+ groups, a dropdown lets them pick which group. If user is not in any group, behaviour is unchanged (mating apiary always shown, no toggle).

### Files Changed

| File | Action |
|---|---|
| `src/app/dashboard/batches/page.tsx` | Added hook import, interfaces, form state, toggle UI, conditional mating apiary, submit/edit/reset wiring |
| `docs/features/batch-rearing-group-toggle.md` | Updated documentation |
| DB migration | `add_rearing_group_id_to_rearing_batches` |
