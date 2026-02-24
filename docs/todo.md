# Add Date Tracking to Cell Frame

## Tasks
- [x] 1. Add `handleBulkDateChange` function to `useBatchGrafts.ts`
- [x] 2. Add date input under each cup + bulk date input in `CellFrame.tsx`
- [x] 3. Wire new props (`updateGraftStatusDate`, `handleBulkDateChange`) in `BatchGraftsSection.tsx`

## Review

### Summary of Changes

**`src/hooks/useBatchGrafts.ts`** (+16 lines)
- Added `handleBulkDateChange` function — updates `status_date` for all frame-selected grafts in one Supabase call, following the same pattern as `handleBulkStatusChange`
- Exposed it in the hook's return object

**`src/components/batches/CellFrame.tsx`** (+13 lines)
- Added `updateGraftStatusDate` and `handleBulkDateChange` to props interface and destructuring
- Added individual `<input type="date">` below each cup's status dropdown (only for frame-stage grafts, non-select mode) — lets users see/edit when a status change happened
- Added bulk `<input type="date">` in the bulk action bar between status dropdown and delete button

**`src/components/batches/BatchGraftsSection.tsx`** (+2 lines)
- Wired `handleBulkDateChange` and `updateGraftStatusDate` from hook to `<CellFrame>`

### No changes to
- Database schema (`status_date` column already exists)
- `graftConstants.ts`
- `QueenTrackingSection.tsx` (already has date editing)

### Testing
- Run `npm run build` to verify no type errors
- Test: change a cell status → date auto-sets to today, visible under the cup
- Test: edit the date input under a cup → updates that cell's `status_date`
- Test: bulk select cells → pick a date in the bulk bar → all selected dates update
