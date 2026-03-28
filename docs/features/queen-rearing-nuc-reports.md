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

### Audit Hardening (Post-Implementation)
- **[Critical]** Added explicit error state (`fetchError`) with retry button — fetch failures no longer silently show as empty data.
- **[High]** PostgREST array join normalisation — follows `ManageNucsTab` pattern instead of `as unknown` cast.
- **[High]** Batch Performance React keys changed from `batchName` (non-unique) to `batchId` (UUID).
- **[Medium]** Invalid Date guard (`isNaN`) on `setupDate` for malformed date strings.
- **[Medium]** Fixed operator precedence on tone fallback expressions.
