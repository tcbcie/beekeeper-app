# Batch 15: Mating Nuc Data-Loss Fixes

**Status:** Done 19/10/2026. The owner tested it; committed and pushed. The data repair and the migration were applied through MCP.
**Checklist:** `tasks/security-batch15-todo.html`
**Findings:** C5a-01, C5a-02 and C5a-03, from the Phase 2 audit. This is Phase 2 fix batch 3.

## C5a-01: emerged grafts reset to in_nuc

- `MatingNucsTab.tsx` `fetchNucs` has a self-heal that moved sealed, caged **and emerged** grafts in active nucs to `in_nuc` on every load. A virgin inspection's `emerged` was therefore undone the next time the list loaded.
- The self-heal now moves only `sealed`/`caged`. Every way of putting a cell into a nuc already sets `in_nuc` itself.
- **Data repair (approved by the owner, 19/10/2026):**
  - 15 grafts were `in_nuc` while their nuc was `virgin`: 11 in another beekeeper's account (nucs A1–A11, retired), 1 in the owner's TQRQB_UG01 (nuc 135) and 3 in the owner's test account.
  - They were set back to `emerged`, by ID, in one statement that rolls back unless exactly 15 rows change. `status_date` was left as it was, since it already held the inspection dates.
  - Before the repair, all 15 had `status = 'in_nuc'`. To reverse it, set those IDs back to `in_nuc`; the IDs are in `tasks/security-batch15-todo.html`.
  - **Effect:** 7 of that beekeeper's grafts had no emerged date on their nuc, so they weren't counted as hatched. Their NIHBS report now counts them, and their stored batch counts update the next time the batch editor is opened.

## C5a-02: backdated or edited inspections rolled the status back

- `NucInspectionPanel.tsx` has one helper, `syncNucFromInspections(mode)`, which replays every inspection in date order and is used by save, edit and delete. See `nuc-inspection-status-sync.md` for the rules.
- **The modes:**
  - `'status'`: used when the saved inspection carries a queen status, or on edit carried one.
  - `'dates'`: used for notes-only inspections, so a status set by hand is kept.
  - `'reset'`: used when a status-bearing inspection is deleted.
- **Hardening:**
  - A failed read now stops the write; it used to reset the nuc to `setup`.
  - Same-day inspections are ordered by `created_at`.
  - `sold` grafts are never changed.
  - The graft `status_date` is the deciding inspection's date.

## C5a-03: bulk create wasn't atomic

- **New function:** `public.create_mating_nuc_bulk(p_batch_id, p_source_batch_id, p_mode, p_notes, p_nucs jsonb) returns uuid[]` (migration `20261019100000_mating_nuc_bulk_create.sql`, applied through MCP).
  - **Security:** it is plpgsql, SECURITY INVOKER (owner-only RLS still applies) and `search_path = public`. EXECUTE is granted to `authenticated` only, and revoked from public and anon.
  - **Writes, in one transaction:** it inserts the bulk-run row (with `created_count` set directly), inserts the nucs and moves their cells to `in_nuc`.
  - **Checks first:** a per-user advisory lock stops two requests both passing, then it re-checks:
    - no active nuc already has one of the numbers;
    - no selected cell is already in an active nuc;
    - every cell updated is still `sealed`/`caged`/`emerged`, in the source batch and owned by the caller (the row count must match, or it rolls back).
- **Client changes:** `useMatingNucBulk.createBulkNucs` makes the run ID itself with `crypto.randomUUID()`, as the apiaries page already does, so the reference codes can be built before the call. It then makes a single `rpc()` call. The function's messages ("These nuc numbers are already active: …", "Some selected cells are no longer available…") reach the toast as they are.

## Verification

- `npx tsc --noEmit` shows no errors in `src/`, and ESLint is clean.
- The function was checked live: `prosecdef = false`, `search_path=public`, anon can't execute it, authenticated can. The security advisor has nothing new.
- After the repair, all 15 nucs with status `virgin` have `emerged` grafts.
