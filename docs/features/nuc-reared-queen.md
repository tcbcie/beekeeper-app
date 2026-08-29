# Mark, number and distribute a queen reared in a mating nuc

Lets a queen raised in a mating nuc be marked, numbered and distributed **even when the nuc has no
linked batch graft** — the case where a graft goes straight into the nuc rather than through a
rearing batch's cell list.

## Background

Two separate gaps blocked this.

### A mating nuc had nowhere to record the queen reared inside it

`mating_nucs.queen_id` looks like it should hold the nuc's queen. It does not — it holds the
**breeder/mother**. The setup form labels it *"Grafted from"*, it is auto-filled from the selected
cell's `batch_grafts.breeder_queen_id`, and the nuc card renders it as *"Breeder Queen: …"*.

Across all 142 rows in `mating_nucs`, not one `queen_id` pointed at a queen with `source_graft_id`
set — every one was a breeder. There was no column anywhere for the daughter.

### Every queen action was gated on `graft_id`

A nuc set up without choosing a batch has `graft_id = NULL` (the Cell/Graft picker only appears once
a batch is chosen). That hid all three actions:

| Action | Old gate |
|---|---|
| Mark Queen | `graftId && …` |
| Weight Queen | `graftId && graftStatus && …` |
| Distribute (Send icon) | `nuc.graft_id && …` |
| Distribute modal | `distributeNuc.graft_id && distributeNuc.batch_id` |

Marking also wrote the number to `batch_grafts.queen_number`, and `batch_grafts.batch_id` is
`NOT NULL` — so a batch-less nuc had no row to hold a queen number at all.

## Design: minting is separate from marking

**Marking is optional and is never a prerequisite for distribution.** You may have an unmarked virgin
you want to sell, and requiring a marking first would block a legitimate sale.

Instead the queen record is minted **on demand** by whichever action needs it first. Both call the
same idempotent RPC; every marking argument is optional.

This inverts how the rest of the app works. There are only three code paths that create a `queens`
row — the manual Add Queen form, `create_queen_for_distribution` (fires only when a distribution is
saved *and* a recipient app user is set), and `ensure_reared_queen_record` (whose only UI lists
grafts that already have a distribution row). So the app could previously only say *"distribute in
order to create the record"*, never *"create the record, then decide"*. That is why a nuc queen who
was never distributed existed nowhere.

## Data model

```sql
ALTER TABLE mating_nucs
  ADD COLUMN reared_queen_id uuid REFERENCES queens(id) ON DELETE SET NULL;

CREATE INDEX mating_nucs_reared_queen_id_idx
  ON mating_nucs (reared_queen_id) WHERE reared_queen_id IS NOT NULL;
```

`queen_id` keeps its existing meaning (the breeder). It is **not** renamed — it means "breeder" in
around fifteen places and renaming buys nothing.

> **PostgREST note.** `mating_nucs` now has **two** foreign keys to `queens`, so a bare
> `queens(queen_number)` embed became ambiguous and would fail at runtime. Every embed must name its
> constraint: `queens!mating_nucs_queen_id_fkey(...)` for the breeder and
> `reared_queen:queens!mating_nucs_reared_queen_id_fkey(...)` for the daughter. Five call sites were
> updated — two in `MatingNucsTab.tsx`, three in `src/lib/ai/tools/nucs.ts`.

## Database function

```sql
ensure_nuc_reared_queen(
  p_nuc_id         uuid,
  p_queen_number   text DEFAULT NULL,
  p_marking_colour text DEFAULT NULL,
  p_marked_date    date DEFAULT NULL
) RETURNS uuid
```

`SECURITY DEFINER`, `search_path = public`, `EXECUTE` revoked from `public`/`anon` and granted to
`authenticated`.

- **Idempotent.** Once `reared_queen_id` is set, later calls update that queen in place rather than
  minting a second one. Marking after distributing renumbers the same record.
- **Status-guarded.** Raises unless the nuc is `virgin`, `mating` or `laying` — before a virgin has
  emerged there is no queen to record. Mirrored client-side by `NUC_QUEEN_PRESENT_STATUSES`.
- **Duplicate-guarded.** Raises *"A queen numbered X already exists in your register"*, matching
  `ensure_reared_queen_record`. There is no DB uniqueness on `queens(user_id, queen_number)` — it is
  an app-level convention — so silently minting a second queen "53" would be worse than an error.

What the minted queen inherits:

| Field | Source |
|---|---|
| `mother_id` | the nuc's `queen_id` — i.e. the breeder. This is what gives her lineage |
| `birth_date` | `queen_emerged_at`, falling back to `setup_date` |
| `mated_date` | `mating_confirmed_at` |
| `status` | `active` when the nuc is `mating`/`laying`, else `virgin` |
| `queen_role` | `production` — she appears in the Queen Register as a normal queen |
| `marking_color` | international code from the birth year (White 1/6, Yellow 2/7, Red 3/8, Green 4/9, Blue 5/0) |
| `source` | `Own Breeding`, matching `ensure_reared_queen_record` |
| `subspecies`, `lineage` | inherited from the mother |
| `mating_station` | the nuc's `mating_location` |

### Queen number for an unmarked queen

`queens.queen_number` is `NOT NULL`, so a queen minted by the distribute route with no marking still
needs one. She is minted as **`Nuc <nuc_number>`** — mirroring the graft flow's existing
`graft.queen_number || 'Cell #' + cell_number` fallback — and that value is overwritten the moment
she is marked and numbered properly.

## Behaviour

### Marking

The **Mark Queen** button now shows when there is a graft **or** the nuc has reached
`virgin`/`mating`/`laying`. The existing inline form (date, read-only colour, optional Queen #) is
reused; only the save handler branches:

- **graft present** — unchanged: writes `batch_grafts.queen_marked`/`queen_number` and
  `mating_nucs.queen_marked_at`.
- **no graft** — calls `ensure_nuc_reared_queen`, which mints or updates the queen and stamps
  `queen_marked_at` itself.

The marking colour previously came from `rearing_batches.emergence_date`. A batch-less nuc has no
batch, so it would have rendered "Unknown" and minted the queen with no colour. It now falls back to
the nuc's own `queen_emerged_at`, then `setup_date`.

### Distribution

The Send icon's `nuc.graft_id` requirement is dropped — it now shows on any non-retired nuc in a
distributable status. Opening it:

- **graft + batch present** — unchanged, distributes through the graft.
- **otherwise** — mints the queen via the RPC, then opens the same `DistributeGraftModal` with
  `sourceQueenId`, using the **registry-queen** path added by
  [`distribute-registry-queen.md`](distribute-registry-queen.md). That path already carries the Queen
  Ledger, CRM order linking, mating confirmation, recipient queen minting and the failure report, so
  no new distribution machinery was needed.

After a successful save the nuc goes to `sold` (existing behaviour) and the reared queen is set to
`status = 'distributed'`, so she leaves the owner's active register — mirroring what the queen detail
page does for a registry-queen distribution.

### Card display

The collapsed card's marking line and the expanded date strip now read the queen number from
`batch_grafts.queen_number` **or** the nuc's own `reared_queen.queen_number`.

## Known behaviour worth knowing

- **Opening the Distribute modal mints the queen, even if you then cancel.** This is deliberate — she
  genuinely exists in the nuc, and the RPC is idempotent, so re-opening reuses the same record and
  marking her later renumbers it rather than creating a duplicate.
- **You cannot distribute a queen to yourself unless the batch belongs to a rearing group you are in.**
  `search_users_for_distribution` excludes `auth.uid()`, so the "App User" tab can never return you.
  This no longer matters much here: the queen is already in your register once minted, so a
  self-distribution is not needed to keep her.
- **Weight Queen still requires a graft** — `queen_weights` is keyed on `graft_id`. Out of scope.

## Files changed

- `src/components/batches/MatingNucsTab.tsx` — `reared_queen_id` + `reared_queen` on the interface,
  disambiguated embeds, `openDistribute` mint-then-open, relaxed Send-icon gate, queen-sourced modal
  branch, donor queen retired on save, card number/colour fallbacks, `nucStatus` passed down.
- `src/components/batches/NucInspectionPanel.tsx` — `nucStatus` prop,
  `NUC_QUEEN_PRESENT_STATUSES`, relaxed Mark Queen gate, branched `handleMarkQueen`, real error
  messages surfaced.
- `src/lib/ai/tools/nucs.ts` — three disambiguated `queens` embeds.

Database objects were applied via the Supabase MCP connection and have **no SQL file** in the repo.

## Follow-up: queen location tracking and the self-distribution dead end

### `nuc_queen_assignment` tracked the wrong queen

`trg_nuc_queen_assignment` opened a `queen_assignments` row from `mating_nucs.queen_id` — the
**breeder**. Every nuc therefore claimed its breeder was parked inside it. Because
`queen_assignment_open()` closes *all* open assignments for a queen before inserting the new one,
creating a nuc also **terminated that breeder's real hive assignment**.

All 24 `location_type = 'nuc'` rows named a non-resident; 8 were still open, including
"UGX1.4 is in nuc 198" from 28/07/2026.

Two changes were needed, not one:

```sql
-- the function now reads reared_queen_id
CREATE OR REPLACE FUNCTION trg_nuc_queen_assignment() ...

-- and the trigger had to be rebound: it fired on UPDATE OF queen_id, so a
-- function reading reared_queen_id would never have run.
DROP TRIGGER nuc_queen_assignment ON mating_nucs;
CREATE TRIGGER nuc_queen_assignment
AFTER INSERT OR DELETE OR UPDATE OF reared_queen_id ON mating_nucs ...
```

Verified: linking a reared queen opens one nuc assignment, clearing it closes hers, and changing
the breeder creates nothing.

### You cannot distribute a queen to yourself, and should not want to

`search_users_for_distribution` filters `AND p.id != auth.uid()`, so the App User tab never returns
you, nothing gets selected, and `canSubmit` (`!!selectedUser`) stays false — the button is disabled
with no explanation.

That exclusion is correct here. Distribution mints a queen for the *recipient*; the donor is set to
`status = 'distributed'`. Distributing to yourself would leave **two records for one bee** — the
donor, plus a copy renamed by `next_free_queen_number` (for queen "53" it returns `53-2`).

Since minting now happens at the nuc, the queen is already in your register and there is nothing to
distribute. To take her out of the nuc: assign her to one of your hives (Hives → edit → Queen), then
retire the nuc. `reared_queen_id` stays behind as provenance.

The modal's empty search state now says so, distinguishing a self-search from a genuine miss.
