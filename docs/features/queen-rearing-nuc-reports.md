# Queen Rearing - NUC Reports Tab

## Overview
Add a new "Reports" tab to the Queen Rearing page (`/dashboard/batches?tab=reports`) that provides various reports on NUC utilisation, current state, and overall queen rearing performance.

## Plan

### Tasks

- [x] 1. Add `'reports'` to the `TabId` union type and `VALID_TABS` array in `batches/page.tsx`
- [x] 2. Add the "Reports" `NavTabButton` to the tab navigation bar
- [x] 3. Create `NucReportsTab.tsx` component in `src/components/batches/`
- [x] 4. Import and render `NucReportsTab` in the batches page when `activeTab === 'reports'`
- [x] 5. Implement report layout cards inside `NucReportsTab`:
  - **NUC Status Overview** - Count of nucs by current status (setup, graft_introduced, virgin, mating, laying, failed, sold, merged)
  - **Equipment Inventory Summary** - Count of inventory nucs by equipment_status (active, ready, retired)
  - **Batch Performance Summary** - Per-batch breakdown: total nucs, success rate (laying/total), failure rate
  - **NUC Utilisation** - Percentage of inventory nucs currently in use vs available
  - **Queen Mating Success Rate** - Ratio of successfully mated queens to total setups
  - **Timeline Metrics** - Average days from setup to mating confirmation, setup to emergence
- [ ] 6. Prompt user to test the build
- [x] 7. Add review section to this document

## Technical Approach
- New tab follows the exact same pattern as existing tabs (MatingNucsTab, ManageNucsTab, etc.)
- `NucReportsTab` receives `userId` prop, fetches data from Supabase directly
- Layout uses the existing card/panel styling (`bg-surface`, `border-border`, etc.)
- Mobile-first responsive design
- Read-only reports - no mutations

## Files to Change
1. `src/app/dashboard/batches/page.tsx` - Add tab type, button, and render
2. `src/components/batches/NucReportsTab.tsx` - New component (report layout)

## Review

### Changes Made
1. **`src/app/dashboard/batches/page.tsx`** — Added `'reports'` to `TabId` union and `VALID_TABS` array, added a "Reports" `NavTabButton`, imported and rendered `NucReportsTab` when the reports tab is active.
2. **`src/components/batches/NucReportsTab.tsx`** — New component (read-only) that fetches all `mating_nucs` for the user (with joined `rearing_batches` data) and derives 6 report sections:
   - NUC Status Overview (badge + count per status)
   - Equipment Inventory Summary (active/ready/retired counts)
   - NUC Utilisation (percentage bar of in-use vs available inventory)
   - Queen Mating Success Rate (percentage bar with colour coding)
   - Timeline Metrics (average days to emergence and mating)
   - Batch Performance table (per-batch success/failure with progress bars)

### Design Decisions
- Single Supabase query fetches all data; all report calculations are client-side derived.
- Uses existing UI components (`Panel`, `Badge`, `LoadingSpinner`, `EmptyState`) for consistency.
- Mobile-first: batch performance uses cards on mobile, table on desktop.
- No mutations — purely read-only reports tab.

### Phase 2: Customisation & PDF Export

#### Tasks
- [x] 1. Add batch filter dropdown — select which rearing batch(es) to include or "All Batches"
- [x] 2. Add time period filter — reuse existing `TimePeriod` type with button toggles (All Time, 3 Months, 6 Months, 1 Year, Custom)
- [x] 3. Filter the derived report data by selected batch and date range
- [x] 4. Add `ReportExportBar` — Print/PDF (via `printReport()`), Export CSV (via `exportToCSV()`), Export Image
- [x] 5. Wrap report content in a `ref` for image export and add `print-container` class for print styling
- [ ] 6. Prompt user to test the build
- [x] 7. Update review section

#### Approach
- Reuse existing `ReportExportBar` component for export buttons
- Reuse existing `printReport()`, `exportToCSV()`, `exportToImage()` from `export-utils.ts`
- Reuse existing `TimePeriod` type from `types/reports.ts`
- Filters use `no-print` class so they're hidden in PDF output
- Single file change: `NucReportsTab.tsx` only

#### Phase 2 Review
- **Batch filter**: Dropdown derived from unique batches in fetched data via `useMemo`. Filters `filteredNucs` which feeds all report calculations.
- **Time period filter**: Reuses `TimePeriod` type from `types/reports.ts`. Button toggle pattern matches `ReportFilters` component. Custom date range with Clear button. Filters on `setup_date`.
- **Export**: Reuses `ReportExportBar`, `printReport()`, `exportToCSV()`, `exportToImage()` from existing utils. Report content wrapped in `ref` with `print-container` class. Filters panel has `no-print` class. Print header shows selected filters context.
- **CSV export**: Exports per-nuc rows with status, batch, setup date, emergence, mating confirmed, retired dates.
- **Single file changed**: `NucReportsTab.tsx` only.

### Audit Hardening — Phase 1
- **[Critical]** Added explicit error state (`fetchError`) with retry button — fetch failures no longer silently show as empty data.
- **[High]** PostgREST array join normalisation — follows `ManageNucsTab` pattern instead of `as unknown` cast.
- **[High]** Batch Performance React keys changed from `batchName` (non-unique) to `batchId` (UUID).
- **[Medium]** Invalid Date guard (`isNaN`) on `setupDate` for malformed date strings.
- **[Medium]** Fixed operator precedence on tone fallback expressions.

### Phase 3: Apidea Overview Table

#### Tasks
- [x] 1. Add `nuc_number` to `NucRecord` interface and Supabase select query
- [x] 2. Add "Apidea Overview" panel — mobile card view + desktop table showing apidea number and queen status
- [x] 3. Add "Apidea Number" column to CSV export
- [x] 4. Update feature documentation

#### Approach
- Reuses existing `activeNucs` (non-retired mating nucs) for the data source
- Reuses existing `STATUS_LABELS` and `STATUS_TONES` maps with `Badge` component
- Desktop: 7-column table (Apidea Number, Queen Status, Setup, Cell Introduced, Queen Emerged, Mating Confirmed, Failed)
- Mobile: card per apidea with name/status header and date grid (only shows dates that have values)
- `failed_at` added to NucRecord interface and Supabase query
- `formatDate` helper for consistent en-GB date display across both views
- CSV export includes all date columns
- Single file change: `NucReportsTab.tsx` only

### Audit Hardening — Phase 2
- **[High]** `handleExportImage` wrapped in try/catch with `toast.error()` — `exportToImage` re-throws on failure, previously caused unhandled promise rejection with no user feedback.
- **[High]** Print header date range consolidated into single expression — previously produced unbalanced parentheses when only one of start/end date was set.
- **[Medium]** Custom date filter inputs guarded with `isNaN` — invalid dates no longer silently filter out all nucs.
