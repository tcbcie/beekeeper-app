# Grafting Frame Visualisation

## Tasks

- [x] 1. Database migration — add `frame_rows` and `cells_per_row` columns to `rearing_batches`
- [x] 2. Update `Batch` and `FormData` interfaces in `batches/page.tsx` — add `frame_rows`, `cells_per_row` fields
- [x] 3. Replace "Number of Grafts" stepper with "Rows" + "Cells per Row" steppers + auto-calculated total
- [x] 4. Update submit handler — include `frame_rows` and `cells_per_row` in upsert payload
- [x] 5. Update edit handler — populate `frame_rows` and `cells_per_row` from batch record
- [x] 6. Update reset handler — reset both new fields to `''`
- [x] 7. Pass `frameRows` and `cellsPerRow` props to `BatchGraftsSection`
- [x] 8. Update `BatchGraftsSection` — accept new props, replace CSS grid with frame visualisation
- [x] 9. Update documentation in `docs/features/queen-rearing.md`
- [x] 10. Prompt user to test the build

## Review

### Summary of Changes

**Database:**
- Added `frame_rows INTEGER` and `cells_per_row INTEGER` nullable columns to `rearing_batches`

**`src/app/dashboard/batches/page.tsx`:**
- Added `frame_rows` and `cells_per_row` to `Batch` interface, `FormData` interface, initial state, reset handler, edit handler, and submit payload
- Replaced single "Number of Grafts" stepper with two side-by-side steppers (Rows + Cells per Row) that auto-calculate `cell_count` as `rows × cellsPerRow`
- Added read-only "Total Grafts: X" display below the steppers
- Passed `frameRows` and `cellsPerRow` as new props to `BatchGraftsSection`

**`src/components/batches/BatchGraftsSection.tsx`:**
- Added `frameRows` and `cellsPerRow` optional props
- Added `CUP_COLORS` map for circular cup background colours per status
- Replaced flat CSS grid with frame visualisation: amber wooden border, horizontal bars per row, connector lines, and circular cell cups hanging below each bar
- Cups are colour-coded by status, show cell number inside, and support the same select mode (ring highlight + checkbox) and action controls (status dropdown, distribute, delete)
- Frame is horizontally scrollable on mobile via `overflow-x-auto`
- Falls back to a single row when `frameRows`/`cellsPerRow` are not set

**`docs/features/queen-rearing.md`:**
- Documented `frame_rows` and `cells_per_row` columns
- Updated component descriptions to reference frame visualisation
- Added frame visualisation to Key Design Patterns list

### Impact
- 2 files modified, 1 database migration applied, 1 docs file updated
- No breaking changes — existing batches without `frame_rows`/`cells_per_row` fall back to a single-row frame display
