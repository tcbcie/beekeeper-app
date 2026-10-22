# Batch 23: Faster Page Loads (Request Chains)

**Status:** Done 22/10/2026. The owner tested it; committed and pushed.
**Checklist:** `tasks/security-batch23-todo.html`
**Findings:** C5b-10, C5b-11, C6-05 (double loads); C3-14, C3-15, C3-16, C9b-10, C6-11, C6-13, C6-14 (waterfalls); C6-15 (URL length). This is Phase 2 fix batch 10. Batch 24 covers C9b-11/12, C6-12, C9b-13/14, C9a-20/21/23, C8a-08..10, C8b-18 and C7b-04.

## Double loads

- **`useBatchesList` and `useQueensList`:** the start-up effect listed the fetch callbacks as dependencies. `setUserId` gave them new identities, so the effect ran again and every first-load request went out twice (about 9 and 11 requests). The effects now depend on `[router]` only, the same as `useHivesList`. The fetchers receive the id as an argument.
- **Queen rearing tabs (`batches/page.tsx`):** the URL-sync effect had `activeTab` in its dependencies. A tab click ran it while the URL still held the old `?tab`, so the page switched back, then forward again, mounting and fetching the tab twice. It now follows the URL only, with a functional update.

## Waterfalls → `Promise.all`

| Where | Round trips | Notes |
|---|---|---|
| `useHivesList.fetchHives` | 7 → 3 | team apiaries, queens, QR tags, inspections and the five last-record queries in one `Promise.all` (conditional ones resolve to empty) |
| `useHiveDetail.fetchHiveData` | 3 → 2 | the hive and its six record lists together, then team apiaries (needs the apiary) |
| `hives/[id]/page.tsx` | 2 reads → 1 | `checkScaleConnections` reads `beep_connected_at, wolf_connected_at` once |
| Dashboard `initUser` | −1 on the main path | dashboard data and ticket status start before the role lookup |
| `useBatchesList.fetchBatches` | 3 → 2 | distribution counts and breeder names together |
| `useQueensList.fetchQueens` | 4 → 3 | hives and missing parents together |
| `useReportsData.fetchBaseData` | 3 → 1 | apiaries, hives and profile (every report) |
| `useReportsData.fetchVarroaMonitoring` | 2 → 1 | checks and treatments |
| `fetchQueenReportData` (queen report and compare) | 4 → 2 | sisters, ratings and the latest snapshot together, then sister averages |
| `useQueenDetail.fetchQueenData` | 4 → 2 | queen and offspring, then parents and sightings |
| `QueenLineageTree.fetchLineage` | 9 → 4 | one `.in()` per generation (`fetchQueensByIds`, never a queens→queens embed); children and siblings load with the parents; duplicates are hidden in the original order, so the warnings are unchanged |

Each query keeps its own error handling. Supabase returns `{ data, error }` rather than throwing, so `Promise.all` doesn't change which errors are thrown or logged.

## Long `.in()` lists: `src/lib/supabase-chunk.ts`

`fetchInChunks(ids, chunk => query.in(col, chunk))` sends ids in chunks of 100 (`.in()` values go in the URL, and a few hundred UUIDs exceed its limit). The chunks run together, the rows are merged, and the first error is returned. **`order` and `limit` apply per chunk**, so callers that rely on them re-sort and re-cut:

- **Sister averages** (C6-15, the queen report error for breeder queens with many daughters): merged, sorted newest first and cut to `INSPECTION_FETCH_CAP`, so the averages cover the same inspections as a single query.
- **Queens list:** the hive lookup and missing parents.
- **Queen tracker:** weights (re-sorted before taking the latest), source queens, and mothers.

## Test reliability

Full parallel runs were randomly failing different page tests on timing (userEvent typing on a busy machine). `vitest.config.mts` sets `testTimeout: 15_000`, and `tests/setup-simple.ts` sets Testing Library's `asyncUtilTimeout` to 3 s. Three consecutive full runs were green.

## Rules

- Independent queries go in one `Promise.all`.
- Start-up effects that call `setUserId` depend on `[router]`, not on fetchers keyed on `userId`.
- An `.in()` list that grows with the account uses `fetchInChunks`.

## Verification

- `tsc --noEmit` shows 0 errors, `eslint src` is clean, and the test suite gives 818 passed and 23 skipped (three runs).
- qa-engineer found no issues.
