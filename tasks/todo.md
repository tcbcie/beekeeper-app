# Code Audit: Distribution Feature Hardening
**Date:** 02/03/2026
**Status:** Complete

## Scope
Files audited:
- `src/hooks/useGraftDistributions.ts`
- `src/hooks/useBatchGrafts.ts`
- `src/components/batches/DistributeGraftModal.tsx`
- `src/components/batches/DistributionList.tsx`
- `src/components/batches/graftConstants.ts`

---

## Findings & Fixes

### HIGH — Stale fetch race condition in `fetchDistributions`
- [x] Added `fetchCounter` ref and stale-request guard to `useGraftDistributions.ts`

### HIGH — `deleteDistribution` falls back to `'mated'` on empty string
- [x] Changed `previousStatus || 'mated'` to `previousStatus ?? 'mated'`

### MEDIUM — `handleDistributeSave` refetches unconditionally on failure
- [x] Moved `fetchGrafts()` and `fetchDistributions()` inside the `success === true` branch

### MEDIUM — `order` array re-allocated on every reduce iteration in modal
- [x] Hoisted to module-level `STATUS_ORDER` constant

### MEDIUM — `handleSubmit` in modal lacks synchronous guard against double-fire
- [x] Added `submittingRef` guard alongside `saving` state check

---

- [x] Updated `docs/features/batch-distributions.md` with audit notes
- [x] Review summary

## Review

### Changes Made

| File | Change | Lines |
|------|--------|-------|
| `src/hooks/useGraftDistributions.ts` | Added `useRef` import, `fetchCounter` ref, stale-request checks in `fetchDistributions` | 1, 89, 92, 155-160 |
| `src/hooks/useGraftDistributions.ts` | Changed `\|\|` to `??` in `deleteDistribution` | 272 |
| `src/hooks/useBatchGrafts.ts` | Moved refetch calls inside success branch of `handleDistributeSave` | 280-288 |
| `src/components/batches/DistributeGraftModal.tsx` | Hoisted `STATUS_ORDER` to module level | 27 |
| `src/components/batches/DistributeGraftModal.tsx` | Added `submittingRef` double-submit guard | 94, 176, 220 |
| `docs/features/batch-distributions.md` | Added Code Hardening section documenting all fixes | New section |

### Impact
- 5 targeted fixes across 3 source files
- No schema, API, or component structure changes
- No new dependencies
- All fixes are defensive improvements — no behaviour change for the happy path

### Not Changed (reviewed and found acceptable)
- `DistributionList.tsx` — read-only display, all access uses optional chaining, no issues found
- `graftConstants.ts` — `formatDateIrish` has safe null check and length validation, no changes needed
- `useBatchGrafts.ts` bulk handlers — error handling adequate, selection pruning correct
