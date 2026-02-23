# Status Date Column for Queen Tracking Table

## Todo

- [x] 1. Database migration — add `status_date` column to `batch_grafts`
- [x] 2. Update `Graft` interface to include `status_date`
- [x] 3. Update `updateGraftStatus` to set `status_date` to today
- [x] 4. Update `handleTableBulkStatusChange` and `handleBulkStatusChange` to set `status_date` to today
- [x] 5. Add editable date column to desktop table (between Status and Queen Marked)
- [x] 6. Add editable date field to mobile cards
- [x] 7. Add `updateGraftStatusDate` handler for inline date edits
- [x] 8. Update docs
- [ ] 9. Prompt user to test

## Review

### Summary of Changes

**Database:**
- Added `status_date DATE` column to `batch_grafts` (nullable, existing rows get NULL)

**`src/components/batches/BatchGraftsSection.tsx`:**
- Added `status_date: string | null` to `Graft` interface
- `updateGraftStatus` now sets `status_date` to today (`YYYY-MM-DD`)
- `handleBulkStatusChange` (frame) now sets `status_date` to today
- `handleTableBulkStatusChange` (table) now sets `status_date` to today
- Added `updateGraftStatusDate` handler for inline date edits (saves on change)
- Desktop table: new "Date" column with `<input type="date">` between Status and Queen Marked
- Mobile cards: new "Status Date" row with `<input type="date">` between Status and Queen Marked

**`docs/features/queen-rearing.md`:**
- Documented `status_date` column in `batch_grafts` table description

### Impact
- 1 database migration, 1 component modified, 1 doc updated
- No new files, no new dependencies
- Existing grafts show blank date (NULL) — date only starts tracking from now on
