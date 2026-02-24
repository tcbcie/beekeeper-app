# BatchGraftsSection Modularisation

## Overview
Refactored `BatchGraftsSection.tsx` (1,287 lines) into 7 focused modules for improved readability and maintainability.

## Architecture

### Constants (`src/components/batches/graftConstants.ts`)
Shared interfaces, status arrays, colour maps, and utilities used across all graft-related components.

### Hook (`src/hooks/useBatchGrafts.ts`)
Custom hook containing all state management and business logic:
- Data fetching (grafts + group members)
- CRUD operations (generate, update status, delete, queen marked/number)
- Distribution wrappers (create, delete, toggle mating, bulk)
- Frame selection (toggle, select all, deselect, exit)
- Table selection (toggle, select all, deselect, exit)
- Bulk handlers (frame: status change, delete; table: status change, queen marked, delete)
- Computed values (statusCounts, tableGrafts, distributedGraftIds, markingColour)

### Sub-Components
- `GraftHelpBanner.tsx` — Static help content
- `CellFrame.tsx` — Frame visualisation with inline bulk actions
- `QueenTrackingSection.tsx` — Queen tracking table (desktop + mobile) with bulk bar
- `DistributionList.tsx` — Distribution cards with mating toggle and delete

### Composition Layer (`BatchGraftsSection.tsx`)
Thin wrapper that calls `useBatchGrafts()` and renders sub-components + modals.

## Shared Constants
`TYPE_LABELS` is now shared between `BatchGraftsSection` and `DistributeGraftModal` via `graftConstants.ts`.

## Type Safety
- `GraftStatus` union type (`'grafted' | 'accepted' | 'sealed' | ...`) enforces valid status values at compile time
- `Graft.status` uses `GraftStatus` instead of loose `string`
- Explicit `as Graft[]` cast at the Supabase data boundary (untyped client)

## Performance
- All computed values in `useBatchGrafts` are wrapped in `useMemo` to prevent unnecessary child re-renders
- `onCountsChange` callback uses `useRef` pattern to avoid infinite re-render loops in the parent sync effect
