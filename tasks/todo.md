# Track Distributed Cells in Virgin Queen Tracker & NIHBS Report

**Date:** 2026-03-13

## Tasks

- [x] 1. Virgin Queen Tracker hook — include `queen_cell` distributions
- [x] 2. Tracker UI — show type badge to distinguish cells from virgin queens
- [x] 3. Mark as Mated feedback — update `graft_distributions` mating_confirmed when a cell queen is marked mated
- [x] 4. NIHBS Report — verified no changes needed (auto-calculates from mating_confirmed)
- [x] 5. Update feature docs

## Review

### Changes Summary

| File | Change |
|------|--------|
| `src/hooks/useVirginQueenTracker.ts` | Added `'queen_cell'` to distribution type filter and `TrackedVirginQueen` type union |
| `src/components/batches/VirginQueenTrackerTab.tsx` | Added Type column with colour-coded badge (amber Cell, blue Virgin, green Mated) in both desktop table and mobile cards |
| `src/app/dashboard/queens/[id]/page.tsx` | `handleMarkMated` now also updates the matching `graft_distributions` record with `mating_confirmed = true`, `mating_confirmed_date`, and `mating_location` (non-blocking) |
| `docs/features/virgin-queen-tracker.md` | Updated scope, added distribution types section and cell→mated feedback documentation |

### Data Flow
```
Cell queen marked as mated (queen detail page)
  → queens table: status = 'active', mated_date set
  → graft_distributions table: mating_confirmed = true (non-blocking)
    → Virgin Queen Tracker: shows mated badge
    → NIHBS Report B26: auto-counted as externally mated
```

### No Changes Needed
- **NIHBS Report** (`useNIHBSReport.ts`): Line 239 already checks `d.mating_confirmed` regardless of distribution type
