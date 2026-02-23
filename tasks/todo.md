# Queen Tracking Table — Bulk Actions + Marking Colour

## Todo

- [x] 1. Add `emergenceDate` prop to `BatchGraftsSection` and pass from parent
- [x] 2. Add table selection state (`tableSelectedIds`, `tableSelectMode`)
- [x] 3. Add table selection UI (checkboxes on rows, Select/Done button)
- [x] 4. Add table bulk action bar (status change, mark/unmark, distribute, delete)
- [x] 5. Add marking colour note above the table
- [x] 6. Re-import `createBulkDistributions` for table bulk distribute
- [x] 7. Update documentation
- [x] 8. Code audit — hardening fixes
- [ ] 9. Prompt user to test

## Code Audit Fixes

| Severity | Issue | Fix |
|----------|-------|-----|
| CRITICAL | Stale `tableSelectedIds` not pruned on data refresh — bulk ops could target grafts no longer in the table | Added `setTableSelectedIds` pruning in `fetchGrafts` mirroring the existing frame pruning |
| HIGH | `tableSelectMode` persists when table section empties — phantom action bar on re-entry | Added `useEffect` that resets table select mode when no table grafts exist |
| HIGH | Both frame and table select modes can be active simultaneously — confusing dual action bars | Added mutual exclusion: entering one mode exits the other |
| MEDIUM | `COLOUR_DOTS` object re-allocated inside render IIFE every cycle | Hoisted to module-level constant |
| MEDIUM | `new Date(emergenceDate).getFullYear()` renders NaN for malformed dates | Pre-computed `emergenceYear` with `isNaN` guard in JSX condition |

## Review

### Summary of Changes

**`src/app/dashboard/batches/page.tsx`:**
- Passed `emergenceDate={editingBatch.emergence_date}` prop to `BatchGraftsSection`

**`src/components/batches/BatchGraftsSection.tsx`:**
- Added `emergenceDate` to props interface and destructuring
- Added imports: `getQueenColorFromYear`, `BulkDistributionData`, `createBulkDistributions`
- Added table selection state: `tableSelectMode`, `tableSelectedIds`, `bulkDistributeGrafts`
- Added table selection helpers with frame pruning and table pruning in `fetchGrafts`
- Added `useEffect` to reset table select mode when table empties
- Added mutual exclusion between frame and table select modes
- Added table bulk handlers: status change, mark/unmark, delete, bulk distribute
- Added Select/Done button, bulk action bar, checkbox column (desktop + mobile)
- Added marking colour note with hoisted `COLOUR_DOTS` constant and NaN guard
- Added bulk distribute modal using existing `DistributeGraftModal` bulk mode

**`docs/features/queen-rearing.md`:**
- Updated component and design pattern descriptions

### Impact
- 3 files modified, no database changes, no new files
- 5 defensive hardening fixes applied during code audit
