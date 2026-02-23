# Split Grafts into Frame + Queen Tracking Table

## Todo

- [x] 1. Database migration — add `queen_marked` and `queen_number` columns to `batch_grafts`
- [x] 2. Update `Graft` interface — add `queen_marked` and `queen_number` fields
- [x] 3. Define `FRAME_STATUSES` and `TABLE_STATUSES` constants
- [x] 4. Split grafts into `frameGrafts` / `tableGrafts` arrays
- [x] 5. Limit frame cup dropdown to frame statuses only (grafted, accepted, failed)
- [x] 6. Limit bulk action bar status dropdown to frame statuses
- [x] 7. Update selectAll/deselectAll to only apply to frameGrafts
- [x] 8. Add queen tracking table below the frame (desktop table + mobile cards)
- [x] 9. Add `updateGraftQueenMarked` and `updateGraftQueenNumber` handlers
- [x] 10. Update feature documentation
- [ ] 11. Prompt user to test

## Review

### Summary of Changes

**Database:**
- Added `queen_marked BOOLEAN DEFAULT false` and `queen_number TEXT` (nullable) to `batch_grafts`

**`src/components/batches/BatchGraftsSection.tsx`:**
- Added `queen_marked` and `queen_number` to `Graft` interface
- Defined `FRAME_STATUSES` (grafted, accepted, failed), `TABLE_STATUSES` (caged, emerged, in_nuc, mated, failed, sold), and `FRAME_STATUS_VALUES` helper
- Split grafts into `frameGrafts` (grafted/accepted) and `tableGrafts` (all others)
- Frame visualisation now only renders `frameGrafts` — shows message when all have progressed
- Frame cup dropdowns limited to `FRAME_STATUSES` only
- Removed distribute button from frame cups (not applicable at grafted/accepted stage)
- Bulk action bar dropdown limited to `FRAME_STATUSES`, removed bulk distribute button
- `selectAll` now only selects frame grafts
- Added queen tracking table below the frame:
  - Desktop: table with Cell #, Status dropdown, Queen Marked checkbox, Queen Number text input, Actions (distribute + delete)
  - Mobile: card view with the same controls
- Added `updateGraftQueenMarked` and `updateGraftQueenNumber` handlers that update DB and optimistically update local state
- Queen number saves on blur to avoid excessive DB calls

**`docs/features/queen-rearing.md`:**
- Documented new `queen_marked` and `queen_number` columns
- Documented frame/table split behaviour
- Updated component description and design patterns

### Impact
- 1 file modified, 1 database migration applied, 1 docs file updated
- No breaking changes — existing grafts default to `queen_marked = false` and `queen_number = null`
