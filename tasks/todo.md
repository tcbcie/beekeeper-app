# Modularise BatchGraftsSection.tsx

## Tasks
- [x] 1. Create `graftConstants.ts` — extract interfaces, constants, colour maps, formatDateIrish
- [x] 2. Create `useBatchGrafts.ts` — extract all state and business logic into a custom hook
- [x] 3. Create `GraftHelpBanner.tsx` — extract help banner component
- [x] 4. Create `CellFrame.tsx` — extract frame visualisation + frame bulk action bar
- [x] 5. Create `QueenTrackingSection.tsx` — extract queen tracking header, table, mobile cards, table bulk bar
- [x] 6. Create `DistributionList.tsx` — extract distribution cards section
- [x] 7. Refactor `BatchGraftsSection.tsx` — thin composition layer using the new modules
- [x] 8. Update `DistributeGraftModal.tsx` — import shared TYPE_LABELS from graftConstants

## Review

### Summary
Refactored `BatchGraftsSection.tsx` from a single 1,287-line file into 7 focused modules:

| File | Purpose | ~Lines |
|------|---------|--------|
| `graftConstants.ts` | Shared interfaces, status arrays, colour maps, `formatDateIrish` | 80 |
| `useBatchGrafts.ts` | All state, effects, CRUD, selection, bulk handlers | 500 |
| `GraftHelpBanner.tsx` | Static help banner component | 35 |
| `CellFrame.tsx` | Frame visualisation + frame bulk action bar | 150 |
| `QueenTrackingSection.tsx` | Queen tracking header, table, mobile cards, table bulk bar | 300 |
| `DistributionList.tsx` | Distribution cards with mating toggle and delete | 120 |
| `BatchGraftsSection.tsx` | Thin composition layer | 150 |

### Changes Made
- **No logic changes** — all business logic moved verbatim into the hook
- **No UI changes** — all JSX moved verbatim into sub-components
- **Removed duplicate** `TYPE_LABELS` from `DistributeGraftModal.tsx`; now imports from shared `graftConstants.ts`
- All async functions in the hook wrapped with `useCallback` following the existing `useGraftDistributions` pattern
- Used proper `Dispatch<SetStateAction<T>>` types for state setter props

### Verification
- User should run `npm run build` to check for TypeScript/lint errors
- User should manually test: generate grafts, change status on frame, bulk select on frame, queen tracking table (desktop + mobile), distribution flow, bulk distribute

---

## Code Audit

### Fixes Applied (6 total)

| # | Severity | File | Issue | Fix |
|---|----------|------|-------|-----|
| 1 | CRITICAL | `useBatchGrafts.ts` | Unused `DISTRIBUTABLE_STATUSES` import — build breaker with ESLint `no-unused-vars` | Removed from import |
| 2 | HIGH | `useBatchGrafts.ts` | 5 computed values (`statusCounts`, `tableGrafts`, `distributedGraftIds`, `markingColour`, `emergenceYear`) creating new references every render — unnecessary child re-renders | Wrapped all in `useMemo` |
| 3 | HIGH | `useBatchGrafts.ts` | `onCountsChange` in useEffect deps causes infinite re-render loop if parent doesn't memoise callback | `useRef` pattern for stable callback reference |
| 4 | HIGH | `DistributeGraftModal.tsx` | `TYPE_LABELS[distributionType]` can be `undefined` — runtime crash on `typeInfo.color` | Added `\|\| { label, color }` fallback |
| 5 | MEDIUM | `graftConstants.ts` | `Graft.status` typed as loose `string` — allows silent data corruption | Added `GraftStatus` union type; `as Graft[]` cast at Supabase boundary |
| 6 | MEDIUM | `useBatchGrafts.ts` | `emergenceYear` could propagate `NaN` for malformed dates | Return `null` for `isNaN(year)` |

### Known Pre-Existing Patterns (not introduced by refactoring)
- Fire-and-forget `fetchGrafts()` calls after mutations (no `await`) — pre-existing pattern, not a regression
- No abort controller on group member fetch effect — low impact since `groupId` rarely changes

### Audit Verification
- User should run `npm run build` to confirm no TypeScript/lint errors after audit fixes
