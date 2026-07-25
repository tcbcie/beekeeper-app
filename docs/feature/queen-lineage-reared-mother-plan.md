# Feature Plan: Reared queens as lineage mothers

**Date:** 25/07/2026
**Status:** Planned — awaiting approval

## 1. Problem

A queen reared and distributed **externally** (public/non-app recipient) never gets a `queens`
register record — it lives only in the queen tracker (`graft_distributions` + `batch_grafts`). So it
cannot be chosen as a **Mother Queen** for any daughter you keep, breaking lineage.

Concrete case: **Queen 32W** (emergency queen, in rico's register) came from **Queen 26**, which rico
reared and sold to a public recipient. Queen 26 has **no `queens` row for anyone**, so it can't be set
as 32W's mother.

## 2. Approach (confirmed)

**Promote the reared queen to a register node.** In the queen form's Mother Queen dropdown, offer the
user's reared queens (from the tracker) that are not yet in the register. Selecting one creates a
minimal **breeder/reference** register record for it — keyed idempotently on `source_graft_id` — and
links `mother_id` to that real node, so full ancestor traversal works (and the promoted queen carries
*its own* mother = the batch breeder).

## 3. Data-model facts (verified live via MCP)

- `queens` has: `source_graft_id` (idempotency key), `queen_role` (NOT NULL — use `breeder`),
  `mother_id`, `batch_id`, `birth_date`, `marking_color`, `subspecies`, `source`, `status`,
  `mated_date`, `mated_at_eircode`, `mating_station`, `distributed_by_name`.
- Existing precedent RPCs: `create_queen_for_distribution` (idempotent on `source_graft_id`) and
  `promote_distributed_queen_on_mating`.
- A reared queen's own mother = the cell's breeder: `batch_grafts.breeder_queen_id`, falling back to
  `rearing_batches.mother_queen_id` (multi-breeder rule — see [[multi-breeder-per-cell-mother]]).
- Mother dropdown today: `availableParentQueens = queens.filter(not a lineage descendant)` — no status
  filter; the gap is that reared-external queens aren't in `queens` at all.

## 4. Design

### RPC — `ensure_reared_queen_record(p_graft_id uuid) → uuid`

`SECURITY DEFINER`, `search_path = public`, self-scoped via `auth.uid()`. Steps:

1. Verify the graft belongs to a batch owned by `auth.uid()` (raise otherwise).
2. If a `queens` row already exists for `(user_id = auth.uid(), source_graft_id = p_graft_id)`, return
   its id (idempotent — no duplicate).
3. Otherwise insert a `queens` row owned by `auth.uid()`, deriving from `batch_grafts` +
   `rearing_batches` (+ the graft's distribution when present):
   - `queen_number` = `batch_grafts.queen_number` (fallback: cell number)
   - `birth_date` = emergence date (fallback graft date); `marking_color` from that year
   - `subspecies` = batch breeder's subspecies
   - `mother_id` = `batch_grafts.breeder_queen_id` ?? `rearing_batches.mother_queen_id`
   - `batch_id`, `source_graft_id` = the graft
   - `queen_role = 'breeder'` (breeding stock — excluded from active counts)
   - `status = 'distributed'` (it left possession); `mated_date`/`mated_at_eircode`/`mating_station`
     from the distribution when available
4. Return the queen id.

Grants: revoke EXECUTE from public/anon, grant to authenticated; run `get_advisors` after.

### Candidate list — reared queens not yet in the register

A hook query: the user's `graft_distributions` (own batches) joined to `batch_grafts`
(cell/queen number), **excluding** grafts that already have a `queens` row for the user
(`source_graft_id`). Returned as `{ graft_id, label }` (e.g. `Queen 26 (mated → sold)`).

### Form wiring — `QueenFormSection.tsx`

- Mother Queen `<select>` gains a second `<optgroup label="Reared (from tracker)">` listing the
  candidates, valued as `graft:<graft_id>`.
- On save, if the chosen mother is a `graft:` option, call `ensure_reared_queen_record(graft_id)` to
  get/create the register queen id, then set `mother_id` to it before the normal update.
- The lineage-cycle guard (`getInvalidLineageParentIds`) still applies to register queens; reared
  candidates are new nodes so can't be descendants.

## 5. Open decisions (please confirm in review)

- **Promoted role/status:** `queen_role = 'breeder'`, `status = 'distributed'`. (Alt: a dedicated
  status.) Breeder role keeps it out of the active-colony count while preserving the lineage node.
- **When to create:** on save of the daughter (implicit), matching the approved dropdown UX. (Alt: an
  explicit "Add to register" button.)
- **Candidate scope:** reared queens that were **distributed** (tracker rows). Reared-but-kept queens
  with no tracker row are out of scope for now.

## 6. Out of scope

- Back-filling register records for all historic external distributions (only on-demand when chosen
  as a mother).
- Editing the promoted breeder record's own deeper ancestry beyond its batch breeder.

## 7. Files

- Supabase migration `add_ensure_reared_queen_record_function` (MCP).
- `src/hooks/useQueensList.ts` (or the queens page) — fetch reared-queen candidates.
- `src/components/queens/QueenFormSection.tsx` — optgroup + promote-on-save wiring.
- Types as needed (`queen.ts`).
- Docs: `docs/features/queen-lineage-pedigree.md` update.

## 8. Todo

- [ ] Confirm open decisions (§5).
- [ ] MCP migration: `ensure_reared_queen_record` + grants; `get_advisors`.
- [ ] Candidate-list query.
- [ ] Form optgroup + promote-on-save.
- [ ] Docs; verify (`tsc`/`eslint`); prompt user to test in-app.

## 9. Review

Implemented as planned. Confirmed decisions (§5): `queen_role='breeder'` / `status='distributed'`;
create automatically on save; candidate scope = distributed reared queens only.

- **Migration `add_ensure_reared_queen_record_function`** — `ensure_reared_queen_record(p_graft_id)`
  (`SECURITY DEFINER`, `search_path=public`, self-scoped via `auth.uid()`); idempotent on
  `(user_id, source_graft_id)`; derives number/marking/subspecies/birth/mother from the graft + batch;
  guards against a clashing queen number; EXECUTE revoked from public/anon, granted to authenticated.
  Advisor shows only the expected `authenticated_security_definer_function_executable` notice.
- **`useQueensList`** — new `RearedQueenCandidate` type, `rearedCandidates` state, and
  `fetchRearedCandidates` (the user's distributed reared queens minus those already promoted via
  `source_graft_id`).
- **`QueenFormSection`** — Mother Queen `<select>` gains a "Reared (from tracker)" optgroup
  (values `graft:<id>`); on save a `graft:` selection calls the RPC to promote/link, then proceeds.
- **`queens/page.tsx`** — passes `rearedCandidates`; refetches candidates on save.
- **Verification** — `tsc --noEmit` and `eslint` clean on the changed files.

Known minor: the auto-lineage string on the daughter may omit the dam label on the very first save
(the just-created mother isn't in the local `queens` list yet); `mother_id` is linked correctly, and
re-saving regenerates the lineage string.
