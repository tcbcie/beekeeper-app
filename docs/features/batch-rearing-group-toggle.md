# Batch Rearing Group Toggle

## Overview

When creating/editing a rearing batch, the user can optionally link the batch to a rearing group. The toggle and mating apiary section are conditionally shown based on whether the user belongs to a rearing group.

## Behaviour

| User state | Toggle | Mating apiary section | Group selector |
|---|---|---|---|
| Not in any rearing group | Hidden | Always shown | Hidden |
| In rearing group(s) | Shown | Shown when toggle is ON | Shown if in 2+ groups |

- **Toggle OFF (private):** Batch has no `rearing_group_id`, mating apiary section hidden
- **Toggle ON (group batch):** Batch gets a `rearing_group_id`, mating apiary dropdown shown (user's own apiaries)
- When the toggle is switched OFF, both `rearing_group_id` and `mating_apiary_id` are cleared
- When the toggle is switched ON, `rearing_group_id` defaults to the first available group

## Database

- Nullable column `rearing_group_id` on `rearing_batches` (FK to `rearing_groups`, `ON DELETE SET NULL`)
- Migration: `add_rearing_group_id_to_rearing_batches`

## Files Changed

| File | Change |
|---|---|
| `src/app/dashboard/batches/page.tsx` | Import `useRearingGroups`, add `rearing_group_id` to interfaces/form state, add group toggle UI, conditional mating apiary, wire submit/edit/reset |
| Migration | Add `rearing_group_id` column to `rearing_batches` |
