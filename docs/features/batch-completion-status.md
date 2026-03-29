# Batch Completion Status

## Problem

When all cells in a batch have been distributed/sold/failed, there's no visual indication that the batch is complete. The user has to mentally track this.

## Solution

Use the existing `status` column on `rearing_batches` (text, defaults to `'grafted'`). When all grafts in a batch reach a terminal status (`sold` or `failed`), automatically mark the batch as `'completed'`. Show a "Completed" badge in the batch list and edit view.

### Automatic Detection

A batch is complete when:
- It has grafts generated (`cell_count > 0` and grafts exist)
- Every graft has status `sold` or `failed`

This is checked whenever graft counts are synced to the batch (already happens in `useBatchGrafts`).

### Files Changed

| File | Change |
|------|--------|
| `src/app/dashboard/batches/page.tsx` | Add `status` to Batch interface and fetch query; show badge in list views |
| `src/hooks/useBatchGrafts.ts` | After syncing counts, check if all grafts are terminal and update batch status |

### Behaviour

- Badge shown next to batch name in mobile card and desktop table
- Batch status auto-updates to `'completed'` when all grafts are terminal
- Batch status reverts to `'active'` if a graft is unlocked and changed back (e.g. distribution deleted)
- No manual toggle needed — purely automatic
- No DB migration needed — column already exists
