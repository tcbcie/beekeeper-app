# Batch Distribution Tracking & NIHBS Report Enhancement

## Todo

- [x] 1. Database migration — create `graft_distributions` table, RLS policies, and helper functions
- [x] 2. Create `useGraftDistributions` hook — CRUD operations + user/apiary/hive search
- [x] 3. Create `DistributeGraftModal` component — modal form for recording distributions
- [x] 4. Integrate into `BatchGraftsSection` — add Distribute button + distribution list
- [x] 5. Integrate into `MatingNucsTab` — add Distribute button on distributable nucs
- [x] 6. Update `useNIHBSReport` — auto-calculate distribution counts from records
- [x] 7. Update `NIHBSMonthlyReturn` — show auto-calculated defaults with indicator
- [x] 8. Documentation — create/update feature docs

## Review

### Summary of Changes

**Database:**
- New `graft_distributions` table with RLS policies for user ownership and group owner visibility
- 3 helper functions: `search_users_for_distribution`, `get_recipient_apiaries`, `get_recipient_hives`

**New Files (2):**
- `src/hooks/useGraftDistributions.ts` — CRUD hook with user search, apiary/hive lookup, mating toggle
- `src/components/batches/DistributeGraftModal.tsx` — modal form with debounced recipient search, auto-detected type, conditional apiary/hive pickers

**Modified Files (4):**
- `src/components/batches/BatchGraftsSection.tsx` — added Distribute (Send) icon on distributable grafts, distribution list section below grid with mating confirmation toggle and delete. New `groupId` prop.
- `src/components/batches/MatingNucsTab.tsx` — added Distribute button on nucs with graft_id in virgin/mating/laying status. On distribute, nuc status also set to 'sold'.
- `src/hooks/useNIHBSReport.ts` — fetches `graft_distributions` for group batches, auto-calculates `auto_virgins_distributed_external` and `auto_virgins_external_mated`. Added `auto_*` fields to `MonthlyData` interface. Manual overrides from `nihbs_monthly_returns` take precedence.
- `src/components/rearing-groups/NIHBSMonthlyReturn.tsx` — shows "Auto: X from records" indicator below manual input fields when auto-calculated values exist (both desktop and mobile views).

**Prop Change (1):**
- `src/app/dashboard/batches/page.tsx` — passes `groupId={editingBatch.rearing_group_id}` to `BatchGraftsSection`

**Documentation (3):**
- Created `docs/features/batch-distributions.md`
- Updated `docs/features/nihbs-monthly-returns.md` — documented auto-calculation from distributions
- Updated `docs/features/queen-rearing.md` — added `graft_distributions` table, new files, related doc link

### Impact
- 2 new files, 5 modified files, 1 new database table, 3 new database functions
- No breaking changes to existing functionality
- Manual override workflow preserved for NIHBS report

---

## Code Audit Fixes

- [x] CRITICAL-1: Data corruption on distribution delete — added `previous_graft_status` column to DB + stored/used across all files so deleting a distribution reverts the graft to its actual prior status instead of always `'mated'`
- [x] CRITICAL-2: Non-atomic two-table writes — error-checked secondary Supabase operations in `createDistribution`, `deleteDistribution`, and `handleDistributeSave` (MatingNucsTab)
- [x] HIGH-1: Race condition in debounced search — added `searchCounter` ref to `DistributeGraftModal` to discard stale out-of-order network responses
- [x] HIGH-2: Unhandled promise rejection — added `.catch()` to group member fetch in `BatchGraftsSection`
- [x] MEDIUM-1: Constants inside component body — hoisted `NUC_DISTRIBUTABLE_STATUSES` and `getNucDistributionType` outside `MatingNucsTab` component
- [x] MEDIUM-2: Stale data on fetch error — `fetchDistributions` now clears distributions to `[]` on error

**Database Migration:**
- Added `previous_graft_status TEXT` column to `graft_distributions` table

**Files Modified (4):**
- `src/hooks/useGraftDistributions.ts` — added `previous_graft_status` to interfaces, mapped in fetch, error-checked secondary operations, clear distributions on error
- `src/components/batches/DistributeGraftModal.tsx` — added `useRef` import, `searchCounter` ref for stale-result guard, passes `previous_graft_status: graftStatus` in submit data
- `src/components/batches/BatchGraftsSection.tsx` — uses `dist.previous_graft_status` on delete revert, added `.catch()` to group member fetch
- `src/components/batches/MatingNucsTab.tsx` — hoisted constants outside component, error-checked nuc status update, passes actual graft status from `batch_grafts` relation
