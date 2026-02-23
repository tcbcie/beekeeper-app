# Mating Confirmed Date for Graft Distributions

## Plan

### 1. DB migration — add `mating_confirmed_date` column
- [x] 1. Add `mating_confirmed_date DATE` (nullable) to `graft_distributions` via MCP migration

### 2. `src/hooks/useGraftDistributions.ts`
- [x] 2a. Add `mating_confirmed_date: string | null` to `GraftDistribution` interface
- [x] 2b. Map `mating_confirmed_date` in `fetchDistributions`
- [x] 2c. Update `toggleMatingConfirmed` to set `mating_confirmed_date` to today when confirming, `null` when un-confirming

### 3. `src/components/batches/BatchGraftsSection.tsx`
- [x] 3a. (No change needed — `handleToggleMating` passes the boolean through unchanged; date is set in the hook)
- [x] 3b. Show confirmed date in green below recipient info when `mating_confirmed_date` is set

### 4. Update docs
- [x] 4. Updated `docs/features/batch-distributions.md` and `docs/features/queen-rearing.md`

---

## Review

### Summary of Changes

**DB:** Added `mating_confirmed_date DATE NULL` to `graft_distributions`. Existing rows default to NULL.

**`src/hooks/useGraftDistributions.ts`:**
- Added `mating_confirmed_date: string | null` to `GraftDistribution` interface
- Mapped field in `fetchDistributions`
- `toggleMatingConfirmed` now also sets `mating_confirmed_date` to today when confirming, or `null` when un-confirming

**`src/components/batches/BatchGraftsSection.tsx`:**
- Distribution list shows "Mated: DD/MM/YYYY" in green below recipient info when confirmed
- Button tooltip updated to include the date when confirmed

**Docs:** `batch-distributions.md` and `queen-rearing.md` updated.
