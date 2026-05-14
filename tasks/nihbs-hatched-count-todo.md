# NIHBS B13 (queens_hatched) over-counting fix

## Problem

For batch `TQRQB_RZ01` (rico.zmarzly@gmail.com), the NIHBS monthly return shows:
- B11 (sealed cells) = **9**  correct
- B13 (queen cells hatched) = **9**  **wrong** — none have actually emerged yet

Underlying graft state in DB:
- 7 grafts `failed`
- 9 grafts `in_nuc` (sealed cells were bulk-transferred into mating nucs)
- 0 grafts `emerged` or `mated`

## Root cause

When `useMatingNucBulk.ts:236` transfers cells into nucs, it sets graft `status = 'in_nuc'` regardless of whether the cell was `sealed`, `caged`, or already `emerged`.

Three places then count `in_nuc` as a hatched queen:
- `src/hooks/useNIHBSReport.ts:136`  derived counter for NIHBS report
- `src/hooks/useRearingGroupReport.ts:133`  derived counter for rearing-group report
- `src/hooks/useBatchGrafts.ts:172`  persists `queens_hatched` back to `rearing_batches`

`in_nuc` only means "graft placed into a nuc"  it does not imply the queen has emerged. The user is right: "we don't know if all will hatch".

## Approach (option chosen: Both)

A graft counts as hatched when **either** of the following is true:
1. **Direct graft status**: `status IN ('emerged', 'mated')`, OR `status = 'sold'` with a `graft_distributions.distribution_type IN ('virgin_queen', 'mated_queen')` (already handled).
2. **Confirmed via nuc inspection**: the graft is linked to a `mating_nucs` row whose `queen_emerged_at IS NOT NULL` OR `mating_confirmed_at IS NOT NULL`. These columns are auto-set by `NucInspectionPanel` when an inspection records `queen_status IN ('virgin', 'mated', 'laying')`.

The same change applies to `queens_mated`: count when `status = 'mated'`, OR sold-as-mated, OR linked nuc has `mating_confirmed_at IS NOT NULL`.

Key implication: `in_nuc` on its own no longer counts. Once the user records an inspection (which already auto-syncs graft status AND sets the nuc timestamps), the graft is counted via either path.

## Todos

- [x] **1. Fix NIHBS derived counter** in `src/hooks/useNIHBSReport.ts` (step 2a)
- [x] **2. Fix rearing group derived counter** in `src/hooks/useRearingGroupReport.ts`
- [x] **3. Fix persisted batch counter** in `src/hooks/useBatchGrafts.ts`
- [x] **4. Update docs** (`nihbs-monthly-returns.md`, `queen-rearing.md`)
- [ ] **5. Verify with TQRQB_RZ01 data** (user testing)
  - Open the NIHBS report for the Tribes QRQB group, year 2026
  - Confirm B11 (May) = 9 and B13 (May) = 0
  - Confirm `rearing_batches.queens_hatched` for batch `eb9d4269-…` recomputes to 0 next time the batch page is opened
  - Record an inspection on one of the nucs with `queen_status = 'virgin'` and confirm B13 increments to 1

## Files to touch

- `src/hooks/useNIHBSReport.ts`
- `src/hooks/useRearingGroupReport.ts`
- `src/hooks/useBatchGrafts.ts`
- `docs/features/nihbs-monthly-returns.md`
- `docs/features/queen-rearing.md`

## Out of scope

- Not changing `useMatingNucBulk.ts`. Keeping the existing behavior of setting graft status to `in_nuc` on bulk transfer  it's still useful as a "moved to nuc" marker, just no longer overloaded as a hatched signal.
- Not changing `rearing_batches.queens_hatched` schema or any RLS policies.

## Review

### What changed

**Rule for "hatched" / "mated" in derived counters**
A graft is now counted as `hatched` when **any** of the following is true:
- graft status is `emerged` or `mated`
- graft status is `sold` and the linked `graft_distributions.distribution_type` is `virgin_queen` or `mated_queen`
- the linked `mating_nucs` row has a non-null `queen_emerged_at` **or** `mating_confirmed_at` (set by an inspection)

`in_nuc` on its own no longer counts — it just means a cell was transferred into a nuc. `queens_mated` follows the same shape (status `mated`, sold-as-mated, or `mating_confirmed_at` set).

**Files touched**
- `src/hooks/useNIHBSReport.ts` — replaced the per-graft increment block with an `isHatched`/`isMated` decision; added a `mating_nucs` query keyed by `graft_id` to populate the fallback sets.
- `src/hooks/useRearingGroupReport.ts` — same shape of change.
- `src/hooks/useBatchGrafts.ts` — added `nucByGraftId` state, loaded mating-nuc timestamps alongside the existing weights query inside `fetchGrafts`, and reused them in the persist effect. Also tightened the existing `sold`-graft handling so a `queen_cell` distribution no longer counts as hatched in the persisted column (it was silently doing so before; the NIHBS-side reads the derived count so this only affected the in-batch display).
- `docs/features/nihbs-monthly-returns.md` — rewrote the "Graft-Derived Counter Fallback" section with the new rule and a paragraph explaining why `in_nuc` is excluded.
- `docs/features/queen-rearing.md` — added a "Hatched / Mated Counter Derivation" subsection in the NIHBS Report section.

**No DB migration, no RLS change, no change to the bulk-transfer behaviour.**

### Behaviour on batch TQRQB_RZ01 (Rico, Tribes QRQB Group, 2026)

- DB state: 9 grafts `in_nuc`, 7 `failed`, none `emerged`/`mated`.
- NIHBS report for May 2026: **B11 still 9, B13 will be 0** (immediate effect — the report uses derived counts, not the persisted column).
- The persisted `rearing_batches.queens_hatched` column still holds `9`; it will recompute to `0` the next time the batch page is opened (the persist effect runs on load and writes the corrected value).
- Once any of the nucs gets an inspection with `queen_status = 'virgin' | 'mated' | 'laying'`, the linked graft is auto-promoted (`NucInspectionPanel.tsx:178-194`) AND `mating_nucs.queen_emerged_at` / `mating_confirmed_at` is stamped — either signal flips B13 upwards.

### Caveats

- RLS on `mating_nucs` is owner-only. Group owners running the NIHBS report against other members' batches won't see those members' nuc timestamps — but the inspection auto-sync to graft status (which group owners DO have SELECT on) covers that case, so the fallback only matters for the batch's own owner.
- The persisted `rearing_batches.queens_hatched` for any batch with `in_nuc` grafts will be stale until the batch page is re-opened. No global backfill was run — the writer self-heals. If a sweep is wanted later, a one-off SQL update can clear the column and let the next page-load repopulate it.
- The "temporary" note in `queen-rearing.md` about `queens_mated` using the emergence-month proxy still stands — that is a separate, longer-running concern.
