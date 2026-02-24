# Code Audit — BatchGraftsSection / useGraftDistributions / DistributeGraftModal

## Audit Report

### CRITICAL

**C-1 — Unguarded rollback in `createDistribution` (`useGraftDistributions.ts` line 162)**
If the graft-status update fails, the code attempts a rollback delete but does not check whether the rollback itself succeeded. If the rollback also fails, an orphaned `graft_distributions` record persists while the graft remains at its original status — silent data corruption.

**C-2 — Same unguarded rollback in `createBulkDistributions` (`useGraftDistributions.ts` line 211)**
Identical issue: if the bulk rollback delete fails, multiple orphaned distribution records remain without any indication to the developer.

**C-3 — `Math.max(...spread)` stack overflow risk (`BatchGraftsSection.tsx` line 234)**
`Math.max(...grafts.map(g => g.cell_number))` spreads the entire array as function arguments. JavaScript engines have a call-stack argument limit (~65 536). On large batches this throws `RangeError: Maximum call stack size exceeded`, silently preventing any further grafts from being generated.

**C-4 — `selectAllTable` includes `sold` (distributed) grafts (`BatchGraftsSection.tsx` line 393)**
```typescript
grafts.filter(g => !FRAME_STATUS_VALUES.includes(g.status) && g.status !== 'failed')
```
This filter does not exclude `sold` or grafts that have a distribution record. "Select All" in the table therefore includes locked/distributed rows. Any subsequent bulk status-change or bulk-delete operates on those locked rows, bypassing the entire lock mechanism.

---

### HIGH

**H-5 — Individual checkbox selection of locked grafts not prevented (`BatchGraftsSection.tsx` lines 870–878 desktop, 1002–1009 mobile)**
The select checkbox is rendered for ALL table grafts when `tableSelectMode` is true, with no guard for `isLocked`. A user can manually tick a distributed or failed row and then issue a bulk status change or delete. The `selectAllTable` fix (C-4) does not cover manual selection.

**H-6 — `onCountsChange` never called when `grafts.length === 0` (`BatchGraftsSection.tsx` line 213)**
```typescript
if (!onCountsChange || grafts.length === 0) return
```
If all grafts are deleted, `grafts` becomes `[]` and the parent batch form's accepted/hatched/mated counters are never reset. The parent form retains the last non-zero values and would write them back to the database on the next save.

**H-7 — `fetchGrafts` error swallowed silently (`BatchGraftsSection.tsx` lines 141–144)**
On a Supabase error, only `console.error` is called. `setLoading(false)` fires and the UI renders the "No grafts yet" empty state — indistinguishable from a genuinely empty batch. The user receives no feedback that a network/permission error occurred.

**H-8 — `createBulkDistributions` missing 23505 duplicate-key handling (`useGraftDistributions.ts` line 217)**
`createDistribution` catches PostgreSQL error code `23505` (unique constraint violation) and returns `false` with a meaningful log. `createBulkDistributions` uses only a generic catch, so if any graft in the bulk set is already distributed, the entire operation fails with an opaque error. The caller then shows a generic "Failed to record distributions" toast.

---

### MEDIUM

**M-9 — `formatDateIrish` fragile against ISO timestamps (`BatchGraftsSection.tsx` lines 94–99)**
`split('-')` on `2024-01-15T00:00:00Z` produces `["2024", "01", "15T00:00:00Z"]` — 3 parts, so the `!== 3` guard passes, and the result is `15T00:00:00Z/01/2024`. All current callers use Supabase `DATE` columns (returns `YYYY-MM-DD`) so this is not currently triggered, but one change to the query selecting a `TIMESTAMPTZ` column would silently corrupt every date display.

**M-10 — `sealed` missing from `TYPE_FROM_GRAFT_STATUS` in `DistributeGraftModal.tsx` (line 25)**
`DISTRIBUTABLE_STATUSES` includes `sealed`, but `TYPE_FROM_GRAFT_STATUS` does not. Distributing a `sealed` graft silently falls back to `'queen_cell'` via `|| 'queen_cell'`. The behaviour is accidentally correct for beekeeper semantics, but it is implicit and could silently break if the fallback is ever removed or changed.

---

## Plan

### CRITICAL fixes

- [x] C-1. Guard rollback in `createDistribution` — capture and log rollback result
- [x] C-2. Guard rollback in `createBulkDistributions` — capture and log rollback result
- [x] C-3. Replace `Math.max(...spread)` with `.reduce()` in `generateGrafts`
- [x] C-4. Exclude `sold` and distribution-tracked grafts from `selectAllTable`

### HIGH fixes

- [x] H-5. Suppress checkbox for locked rows in desktop table and mobile cards
- [x] H-6. Call `onCountsChange({ 0, 0, 0 })` when grafts array is empty after load
- [x] H-7. Add `toast.error` in `fetchGrafts` error branch
- [x] H-8. Add 23505 handling in `createBulkDistributions`; improve bulk error toast

### MEDIUM fixes

- [x] M-9. Strip `T…` suffix in `formatDateIrish` before splitting
- [x] M-10. Add `sealed: 'queen_cell'` to `TYPE_FROM_GRAFT_STATUS`

---

## Review

### Summary of Changes

**`src/hooks/useGraftDistributions.ts`:**
- C-1/C-2: Rollback deletes in `createDistribution` and `createBulkDistributions` now capture the rollback result; a distinct error is logged if the rollback itself fails, enabling developer diagnosis of any orphaned records
- H-8: `createBulkDistributions` now catches PostgreSQL error code `23505` (unique constraint violation) consistently with `createDistribution`

**`src/components/batches/BatchGraftsSection.tsx`:**
- M-9: `formatDateIrish` now strips any ISO time suffix (`T…`) before splitting on `-`, preventing corrupted date display if a timestamp is ever passed
- H-7: `fetchGrafts` error branch now shows a `toast.error` — user sees a clear failure message rather than a misleading empty state
- H-6: Count-sync effect now fires with zeros when `grafts` is empty (and loading is complete), preventing stale parent batch counters after all grafts are deleted; `loading` added to dependency array
- C-3: `Math.max(...spread)` replaced with `.reduce()` — safe against `RangeError` on arbitrarily large graft arrays
- C-4: `selectAllTable` now builds a `distributedIds` set from `distributions` state and excludes `sold` and already-distributed grafts — "Select All" in the table can no longer capture locked rows
- H-5: Checkbox in desktop table wrapped in `{!isLocked && ...}`; mobile card checkbox condition extended to `{tableSelectMode && !isLocked && ...}` — locked rows cannot be individually ticked in bulk-select mode
- Bulk error toast improved to indicate the likely cause (duplicate distribution)

**`src/components/batches/DistributeGraftModal.tsx`:**
- M-10: `sealed: 'queen_cell'` added explicitly to `TYPE_FROM_GRAFT_STATUS` — removes reliance on the implicit `|| 'queen_cell'` fallback

**No DB changes required.**
