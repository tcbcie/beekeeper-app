# Cell Frame Date Tracking

## Overview
Displays and allows editing of `status_date` directly on the cell frame visualisation, so users can see when each graft's status changed without navigating to the queen tracking table.

## Features

### Individual Date Editing
- Each frame-stage cell cup shows a small date input below its status dropdown
- Displays the current `status_date` value (auto-set when status changes)
- Users can tap/click to edit the date via native date picker

### Bulk Date Change
- When in select mode, the bulk action bar includes a date input
- Selecting a date updates `status_date` for all selected cells in one operation

## Technical Details

### Files
- `src/hooks/useBatchGrafts.ts` — `handleBulkDateChange` function
- `src/components/batches/CellFrame.tsx` — date inputs (individual + bulk)
- `src/components/batches/BatchGraftsSection.tsx` — prop wiring

### Database
- Uses existing `batch_grafts.status_date` column (no schema changes)
- Individual updates via `updateGraftStatusDate` (already existed in hook)
- Bulk updates via new `handleBulkDateChange` using Supabase `.in('id', ids)`
