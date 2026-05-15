# Multi-Breeder Queens per Batch — Plan

Full feature design: [`docs/features/multi-breeder-queens-per-batch.md`](../docs/features/multi-breeder-queens-per-batch.md).

## Problem

A rearing batch is currently tied to a single `rearing_batches.mother_queen_id`. For larger batches the user grafts from **two or more breeder queens** onto the same frame, and each cell needs to remember **which queen it came from**.

## Approach (agreed with user)

1. **Data model**: new junction table `batch_breeder_queens(batch_id, queen_id, user_id)` + new column `batch_grafts.breeder_queen_id` (FK → queens, ON DELETE SET NULL). `rearing_batches.mother_queen_id` is kept for backward compatibility (single-breeder batches).
2. **Add/Edit Batch form**: new checkbox "Graft from multiple breeder queens". Unchecked → existing single dropdown. Checked → multi-select; saves rows to `batch_breeder_queens` and sets `mother_queen_id = NULL`.
3. **Generate cells**: for multi-breeder batches, show a **range-assignment modal** ("cells X–Y from Queen Z") before inserting. Validates total coverage with no gaps/overlaps.
4. **Cell display**: badge each cell with its breeder queen number (multi-breeder batches only). Per-cell breeder editable via the existing cell edit dialog.
5. **Lock** the single↔multi toggle once any cells exist; per-cell edits still allowed.

## Todos

- [x] **1. DB migration** — applied as `add_multi_breeder_queens` via Supabase MCP. Created `batch_breeder_queens` (PK `(batch_id, queen_id)`, owner-RLS + group-owner SELECT), added `batch_grafts.breeder_queen_id uuid` (FK → queens ON DELETE SET NULL), plus indexes.
- [x] **2. Types** — added `breeder_queen_id: string | null` to `Graft` interface and a `BatchBreederQueen` helper type in `src/components/batches/graftConstants.ts`.
- [x] **3. Add Batch form** — checkbox + conditional single-select / multi-select checkbox-list added. On submit, junction rows are written after the batch insert; `mother_queen_id` is nulled when multi.
- [x] **4. Edit Batch form** — `handleEdit` now async, pre-loads breeder set and graft count. Toggle + multi-select disabled when grafts already exist; helper text shown. Junction set is replaced on save when unlocked.
- [x] **5. Range-assignment modal** — `BreederRangeModal` component added. Per-queen start/end inputs, evenly pre-split, validates contiguous coverage of `[1, cellCount]`.
- [x] **6. Hook changes** — `useBatchGrafts` now loads `batch_breeder_queens` (joined with `queens.queen_number`), exposes `breederQueens`, accepts `generateGrafts({ ranges })`, and exposes `updateGraftBreederQueen`.
- [x] **7. Section wiring** — `BatchGraftsSection` intercepts the Generate click; opens `BreederRangeModal` when breeders are present and `cellCount > 0`, otherwise calls `generateGrafts` directly. Confirm dispatches with ranges.
- [x] **8. Cell frame display** — `CellFrame` shows a small breeder-queen-number label under each cup (multi-breeder only). Title includes breeder text for accessibility.
- [ ] **9. Cell edit dialog** — *deferred to v2.* `updateGraftBreederQueen` is wired into the hook for future use; per-cell edit UI not added in this iteration to keep change scope minimal (per CLAUDE.md simplicity rule).
- [x] **10. Docs** — feature spec in `docs/features/multi-breeder-queens-per-batch.md`. Cross-references added to `docs/features/queen-rearing.md` (rearing_batches, batch_grafts, new `batch_breeder_queens` entry) and `docs/features/nihbs-monthly-returns.md` (multi-breeder note + RLS row).
- [ ] **11. User verification** — user creates a 2-queen test batch, generates cells with a range split, edits one cell's breeder, confirms persistence after reload.

## Files to touch

- `src/sql/2026/<date>-add-multi-breeder.sql` *(new — record of what was applied via MCP)*
- `src/app/dashboard/batches/page.tsx`
- `src/components/batches/BatchGraftsSection.tsx`
- `src/components/batches/CellFrame.tsx`
- `src/components/batches/graftConstants.ts`
- `src/components/batches/BreederRangeModal.tsx` *(new)*
- `src/hooks/useBatchGrafts.ts`
- `docs/features/multi-breeder-queens-per-batch.md` *(new — already drafted)*
- `docs/features/queen-rearing.md` *(cross-reference)*
- `docs/features/nihbs-monthly-returns.md` *(one-liner)*

## Out of scope

- Per-breeder NIHBS reporting (batch-level numbers unchanged).
- Queen lineage views ("queens reared from breeder X").
- Bulk reassignment UI beyond the per-cell edit.
- Group-owner read access to other members' `batch_breeder_queens` (RLS owner-only for now).

## Review

### What changed

**Data model** (applied via `mcp__supabase__apply_migration` — `add_multi_breeder_queens`)
- New table `batch_breeder_queens(batch_id, queen_id, user_id, created_at)` with composite PK `(batch_id, queen_id)`, two indexes, and four RLS policies (owner SELECT/INSERT/UPDATE/DELETE + group-owner SELECT, matching the existing `batch_grafts` pattern).
- New column `batch_grafts.breeder_queen_id uuid REFERENCES queens(id) ON DELETE SET NULL` + index.
- `rearing_batches.mother_queen_id` is **unchanged** in semantics — still authoritative for single-breeder batches.

**TypeScript types** — `src/components/batches/graftConstants.ts`
- `Graft` gained `breeder_queen_id: string | null`.
- New exported `BatchBreederQueen` type.

**Add / Edit Batch form** — `src/app/dashboard/batches/page.tsx`
- `FormData` gained `multiple_breeders: boolean` and `breeder_queen_ids: string[]`.
- New state `editingBatchHasGrafts` controls the lock.
- `handleEdit` is now `async` — it pre-loads the breeder set and graft count in parallel via `Promise.all`.
- `handleSubmit` switched to capturing the inserted batch id (via `.select('id').single()`), then writes `batch_breeder_queens` after the batch row. Junction writes are skipped when locked. Single-breeder mode nulls `mother_queen_id` when multi is active.
- UI: checkbox "Graft from multiple breeder queens" + conditional single-select / checkbox-list. Inputs disabled with helper text when cell records already exist for the batch.

**Cell-generation hook** — `src/hooks/useBatchGrafts.ts`
- New exported `BreederRange` interface and `breederQueens` state.
- `fetchBreederQueens` loads the batch's selected breeders joined with `queens.queen_number` (handles PostgREST's array-shaped join result).
- `generateGrafts(opts?: { ranges })` — when ranges are supplied, each new cell's `breeder_queen_id` is set by 1-based local index lookup.
- New `updateGraftBreederQueen(graftId, queenId)` with optimistic update + rollback (wired into the hook return; UI for per-cell edit deferred to v2).

**Range-assignment modal** — new `src/components/batches/BreederRangeModal.tsx`
- Pre-fills with even split across selected breeders.
- Validates: each row's start/end are valid integers in `[1, cellCount]` with `start ≤ end`; non-skipped ranges sort to contiguously cover `[1, cellCount]` with no gaps or overlaps. Clear error messages on each failure mode.

**Section wiring** — `src/components/batches/BatchGraftsSection.tsx`
- New `showRangeModal` state.
- "Generate Cell Records" click now routes through `handleGenerateClick`: opens the modal when `breederQueens.length > 0 && cellCount > 0`; falls back to direct `generateGrafts()` otherwise.
- Modal `onConfirm` dispatches `generateGrafts({ ranges })`.
- Computed `nextStartCellNumber` (max existing cell_number + 1) passed to the modal so the header shows the correct absolute range.

**Cell frame** — `src/components/batches/CellFrame.tsx`
- New optional `breederQueens` prop with memoised lookup `breederNumberById`.
- Small queen-number label under each cup, **multi-breeder only**. Title attribute exposes the breeder for screen readers.

**Docs**
- `docs/features/multi-breeder-queens-per-batch.md` — full feature spec (data model, user flow, files touched, caveats, scope).
- `docs/features/queen-rearing.md` — updated `rearing_batches` / `batch_grafts` table notes; added `batch_breeder_queens` section.
- `docs/features/nihbs-monthly-returns.md` — "Multi-Breeder Batches" note clarifying NIHBS aggregation is unchanged; added junction-table RLS row.

### Files touched

- `src/app/dashboard/batches/page.tsx`
- `src/components/batches/BatchGraftsSection.tsx`
- `src/components/batches/CellFrame.tsx`
- `src/components/batches/graftConstants.ts`
- `src/components/batches/BreederRangeModal.tsx` *(new)*
- `src/hooks/useBatchGrafts.ts`
- `docs/features/multi-breeder-queens-per-batch.md` *(new)*
- `docs/features/queen-rearing.md`
- `docs/features/nihbs-monthly-returns.md`
- DB: migration `add_multi_breeder_queens` (Supabase)

### Behaviour

- **Existing batches**: unaffected. `mother_queen_id` continues to drive the single-breeder display; junction table is empty; `batch_grafts.breeder_queen_id` is NULL; CellFrame hides the badge.
- **New single-breeder batches**: unchecked checkbox → same UX as before.
- **New multi-breeder batches**: checkbox → multi-select; on save, `mother_queen_id` is NULL and `batch_breeder_queens` rows are inserted. Generating cells opens the range modal; each new cell carries its own `breeder_queen_id`. The cell frame shows the breeder queen number under each cup.
- **Locked editing**: once any grafts exist, the toggle + multi-select are disabled with helper text. Per-cell edit UI is out of scope for v1.

### Caveats

- Per-cell breeder editing UI is **not** included in v1 (the hook exposes `updateGraftBreederQueen` for follow-up).
- The QueenTrackingSection table does not yet show a breeder column — only CellFrame does. Adding a read-only column is a small follow-up.
- Group-owner permissions on `batch_breeder_queens` are SELECT-only; member writes still go through the member's own session.

---

## Post-implementation audit (Principal Architect pass)

A second-pass audit caught several robustness gaps in the just-shipped code. Fixes applied as part of the same change set; categorised below.

### Critical

- **C1 — Non-atomic junction write.** `handleSubmit` was doing `DELETE` + `INSERT` against `batch_breeder_queens` as two separate round trips, with the DELETE's error not even being checked. A failure between them left batches with zero breeders. **Fix:** new Postgres function `replace_batch_breeder_queens(p_batch_id uuid, p_breeder_queen_ids uuid[])` (`SECURITY INVOKER`, `EXECUTE` granted only to `authenticated`). Asserts ownership, then `DELETE` + `INSERT … ON CONFLICT DO NOTHING` in one transaction. App calls it via `supabase.rpc(...)`. Migration: `harden_batch_breeder_queens`.
- **C2 — Silent breeder-fetch failure → cell attribution corruption.** `fetchBreederQueens` was a separate query whose errors only logged to console. The Generate button could render before it loaded, and if it failed, the modal-vs-direct branch picked single-breeder and cells got `breeder_queen_id = NULL` with no warning. **Fix:** merged the breeder query into `fetchGrafts`'s top-level `Promise.all`, so `loading` only flips false when both succeed. On error: toast + early return (loading stays true).

### High

- **H1 — Multi-mode with empty selection saved silently.** Submitting with the checkbox on but no queens picked computed `isMulti = false` and saved a no-breeder batch. **Fix:** validate before submit; toast and abort.
- **H2 — `handleEdit` race across rapid Edit clicks.** Sequential clicks could mix data from two batches. **Fix:** `editFetchGenRef` ref — each invocation captures a generation, discards its result if a newer invocation has started. Errors also gated by the same check and surfaced via toast (M1).
- **H3 — Missing FK on `batch_breeder_queens.user_id`.** **Fix:** `ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` in the same hardening migration.

### Medium

- **M1 — `handleEdit` errors silently swallowed.** Resolved alongside H2: try/catch with toast and an early reset of `editingBatch`.
- **M2 — Non-null assertion `batchId!` in junction row mapping.** Removed: `batchId` is now `string` (definitely-assigned in both branches), and the inserted-id path has an explicit guard (M3).
- **M3 — Missing inserted-id guard.** **Fix:** `if (!inserted?.id) throw new Error('Batch was created but no id was returned')` — surfaces silently-broken Supabase response paths as a toast.
- **M4 — Loose numeric parsing in the range modal.** `parseInt('1e3', 10)` and `parseInt('1.9', 10)` were accepted, silently rounding/truncating. **Fix:** strict positive-integer regex `/^[1-9]\d*$/` rejects decimals, exponents, leading zeros, signs, and whitespace; switched to `Number(...)` after the regex passes.

### Low (not fixed, noted)

- **L1 — Group-owner viewing another member's `queens.queen_number` via the PostgREST join** may return null due to RLS on the `queens` table. The display falls back to `'?'` — graceful degradation.
- **L2 — Pre-existing race on double-clicking "Generate Cell Records."** Out of scope (not introduced by this change).
- **L3 — `BreederRangeModal` captures `breederQueens` at mount.** Short-lived modal; acceptable.
