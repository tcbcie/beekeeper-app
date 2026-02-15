# GDD Tracker - Group by Vegetation Feature

## Goal
Add a "Group by Vegetation" toggle to the GDD Tracker table so users can see all records for a single vegetation type across all years grouped together.

## Plan

- [x] **1. Add group-by state** - Add a `groupByVegetation` boolean state toggle
- [x] **2. Add toggle button in the UI** - Place a "Group by Vegetation" toggle near the table header (beside the existing controls)
- [x] **3. Compute grouped data** - Use `useMemo` to group `sortedRecords` by `vegetation_type_id`, producing groups sorted alphabetically by vegetation name, with records sorted by year desc within each group
- [x] **4. Render grouped view** - When grouping is active, render the table with vegetation name as a header row spanning all columns, with individual records underneath. When not active, keep current flat table as-is.
- [x] **5. Update feature docs** - Update/create docs for the GDD Tracker feature

## Review

### Changes Made

| File | Change |
|------|--------|
| `src/components/tools/GDDTracker.tsx` | Added `groupByVegetation` state, toggle button, `groupedRecords` useMemo, `RecordRow` inline component, grouped table rendering with `Fragment` keys |
| `docs/features/gdd-tracker.md` | Created new feature documentation for the GDD Tracker tool |

### What Was Added
- **Toggle button** next to "Add Record" - styled with forest green when active, neutral when off. Shows icon only on mobile, full label on desktop.
- **Grouped view** - when active, records are grouped by vegetation name alphabetically. Each group has a header row showing the vegetation name (clickable to open info modal) and record count. Records within each group keep existing sort order.
- **RecordRow component** - extracted table row into a reusable inline component to avoid JSX duplication between flat and grouped views. In grouped mode, the vegetation column shows plain text instead of a clickable link (since the group header already provides that).

### No Breaking Changes
- Default view is unchanged (flat table, sort by year desc)
- All existing functionality (edit, delete, sort, share, calculate) works identically
- Only `GDDTracker.tsx` was modified
