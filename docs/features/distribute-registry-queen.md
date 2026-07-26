# Distribute a registry queen

Distribute a queen that was added to the Queen Register by hand — a bought-in queen, a caught
swarm, or a queen recorded retrospectively — to another beekeeper, with the same capability the
batch/graft and mating-nuc distribution points already have.

## Background

Before this change, every distribution was hard-anchored to a rearing batch graft:

- `graft_distributions.graft_id` — `NOT NULL`, `UNIQUE`, FK → `batch_grafts(id)`
- `graft_distributions.batch_id` — `NOT NULL`, FK → `rearing_batches(id)`

A manually-added queen has no graft, so the Redistribute action on the queen detail page
(gated on `queen.source_graft_id && queen.batch_id`) never appeared for it. The gap was noted in
[`redistribute-existing-queen.md`](redistribute-existing-queen.md), which suggested a separate
queen-transfer table.

That route was rejected: it would have meant duplicating the distribution modal, recipient queen
minting, mating confirmation, CRM order linking, the Queen Ledger and the failure report.
Synthesising placeholder batches/grafts was also rejected — it pollutes batch counters, NIHBS
monthly returns and rearing-group reports, all of which count by `batch_id`.

Instead, `graft_distributions` now carries a **second, mutually-exclusive source**.

## Data model

```sql
ALTER TABLE graft_distributions
  ALTER COLUMN graft_id DROP NOT NULL,
  ALTER COLUMN batch_id DROP NOT NULL,
  ADD COLUMN source_queen_id uuid REFERENCES queens(id) ON DELETE CASCADE;

-- Exactly one source per row.
ALTER TABLE graft_distributions ADD CONSTRAINT graft_distributions_source_check CHECK (
  (graft_id IS NOT NULL AND batch_id IS NOT NULL AND source_queen_id IS NULL)
  OR (graft_id IS NULL AND batch_id IS NULL AND source_queen_id IS NOT NULL)
);

-- Mirrors UNIQUE(graft_id): one distribution row per queen.
CREATE UNIQUE INDEX graft_distributions_source_queen_unique
  ON graft_distributions (source_queen_id) WHERE source_queen_id IS NOT NULL;

-- Recipient-side idempotency key (the graft path keeps using queens.source_graft_id).
ALTER TABLE queens
  ADD COLUMN source_distribution_id uuid REFERENCES graft_distributions(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX queens_user_source_distribution_unique
  ON queens (user_id, source_distribution_id) WHERE source_distribution_id IS NOT NULL;
```

Existing rows all have `graft_id` + `batch_id` and satisfy the CHECK retroactively.

The table keeps its `graft_distributions` name. Renaming it would touch ~15 files for no
functional gain.

### Ownership guard

RLS on `graft_distributions` only checks `user_id`, and a CHECK constraint cannot reach another
table, so a caller could otherwise point `source_queen_id` at a queen they do not own. A
`BEFORE INSERT OR UPDATE` trigger closes this:

- `enforce_distribution_source_queen_ownership()` — raises unless
  `queens.user_id = NEW.user_id` for the referenced queen.
- Trigger-only, so `EXECUTE` is revoked from `public`, `anon` and `authenticated` (it must never
  be reachable as an RPC).

## Database functions

| Function | Change |
|---|---|
| `create_queen_for_distribution` | New trailing parameter `p_source_distribution_id uuid`. Idempotency and the already-mated `mated_date` lookup branch on graft vs distribution. Both older overloads (20-arg and 21-arg) were **dropped** so PostgREST named-argument resolution stays unambiguous. |
| `promote_distributed_queen_on_mating` | Previously returned early when `graft_id IS NULL`, so confirming mating on a registry-queen distribution silently did nothing. Now finds the recipient's queen via `source_distribution_id` when there is no graft. |
| `enforce_distribution_source_queen_ownership` | New trigger function (above). |
| `next_free_queen_number` | New helper (below). |

The two callable RPCs are granted to `authenticated` only. The trigger function and
`next_free_queen_number` are internal helpers with EXECUTE revoked from every client role.

### Queen number de-duplication

There is **no** DB uniqueness on `queens(user_id, queen_number)` — it is an app-level convention.
Registry queen numbers are the donor's own and are typically low integers ("1", "2"), so handing
queen "1" to a recipient who already has a queen "1" would silently create a confusing duplicate
in their register.

`next_free_queen_number(user_id, queen_number)` suffixes until free (`1` → `1-2` → `1-3`, bounded
at 50 attempts). It is applied **only** in the queen-sourced branch: graft-sourced numbers are
breeder tags or `Cell #N` and must keep their exact value.

## Behaviour

Entry point is the queen detail page header (`src/app/dashboard/queens/[id]/page.tsx`), in the
same `Send` icon slot as the existing Redistribute button. The two routes never overlap:

| Queen | Action | Write path |
|---|---|---|
| has `source_graft_id` + `batch_id` | Redistribute | `redistributeQueen` — UPDATE of the existing row |
| no `source_graft_id` (registry queen) | Distribute | `createDistribution` — INSERT of a queen-sourced row |

Gating:

- Redistribute: `isOwner && isGraftSourced && status ∈ (active, virgin)` — unchanged.
- Distribute: `isOwner && !isGraftSourced && status ∈ (active, virgin, cell)`.

Status maps to distribution type the same way the graft flow does:
`cell → queen_cell`, `virgin → virgin_queen`, `active → mated_queen`.

After a successful save the donor queen is set to `status = 'distributed'` and detached from its
hive (`queen_id = null`, `is_queenless = true`) — identical to the existing redistribute
post-actions.

`defaultMatingLocation` is pre-filled from the donor queen **only when it is already mated**
(`status === 'active'`). Pre-filling it for a cell or virgin would stamp the donor's station on a
queen that has not mated yet, and would silently satisfy the modal's "apiary or mating location"
validation so the user is never asked where it is actually going — the same defect fixed for the
batch flow in `tasks/distribute-mating-location-todo.html`.

The modal (`DistributeGraftModal`) is reused wholesale. `graftId`, `batchId`, `cellNumber` and
`graftStatus` became optional and a `sourceQueenId` prop was added; every other field — group
member / app user / other beekeeper tabs, distribution date, recipient apiary and hive, mating
location, CRM order linking, club-member flag, notes — is untouched.

### Recipient provenance

`createQueenForRecipientFromQueen` in `src/hooks/useGraftDistributions.ts` mirrors
`createQueensForRecipient` but derives provenance from the **donor queen** rather than a batch:
birth date, marking colour (recomputed from birth year, falling back to the donor's marking),
subspecies, mating station/eircode and a mother snapshot. It reuses `buildLineageString` and
`formatQueenSnapshot` so the lineage string matches the edit form. Like its sibling it is
non-blocking — the distribution is already committed when it runs.

The donor's mother is resolved with a **second batched lookup**, never an inline
`queens → queens` embed (PostgREST cannot infer the direction of a self-join).

## Queen Ledger

Registry-queen distributions appear in the Queen Ledger alongside batch-reared ones, with the
full outcome set: mating confirmed, overwintered, offspring hybridised, queen failed.

Two changes made this work in `src/hooks/useQueenTracker.ts`:

1. **The join is now per-query.** `distributionSelect(innerBatch)` emits a LEFT join for the
   own-rows query (an inner join dropped every batch-less row) and keeps `!inner` for the
   owned-group query, which filters on the embedded `rearing_group_id` — something PostgREST only
   allows on an inner join. Group distributions are always graft-sourced, so nothing is lost.

   Because the select string is no longer a literal, supabase-js can no longer infer the row
   shape, so rows are cast to an explicit `DistributionQueryRow` type. Do **not** replace the
   inner join by pre-resolving the group's batch ids and filtering on `batch_id`: that list grows
   with every batch a group ever creates and will eventually overflow the request URL.
2. **Nullable batch fields.** `graft_id`, `batch_id`, `cell_number`, `batch_name`, `graft_date`
   and `batch_owner_id` on `TrackedQueen` are now nullable, and `source_queen_id` was added. The
   guards that skipped rows without a batch or cell number now only apply to graft-sourced rows.

Donor queen details (number, subspecies, colour) are batch-fetched so a registry row still has an
identity. In the UI a row with no tagged queen number and no batch reads **"Registry queen"**, and
the detail panel's Batch field reads **"Registry queen (no batch)"**. Such rows never appear in the
batch or member filters, since they belong to neither.

The queen failure report (`useReportsData.ts`) dropped its own `rearing_batches!inner` and embeds
`queens!graft_distributions_source_queen_id_fkey(queen_number)` so registry queens are labelled by
their own number.

## Deliberately out of scope

- **Bulk distribution** of registry queens — the graft flow has it, but it needs a multi-select on
  the queens list, which is a separate UI job.
- **Batch-page distribution list** — filtered by `batch_id`, so registry-queen distributions
  correctly never appear there. They surface in the Queen Ledger instead.
- **NIHBS and rearing-group reports** — explicitly batch-scoped returns. A bought-in queen passed
  on is not batch-reared output and must not inflate them.
- **Deleting a registry-queen distribution** — `deleteDistribution` tolerates a null `graftId`
  (it skips the graft-status revert), but no UI currently exposes deletion for these rows, so the
  donor queen's `distributed` status is not reverted.

## Files changed

| File | Change |
|---|---|
| `src/hooks/useGraftDistributions.ts` | Nullable source fields on `CreateDistributionData`; `createDistribution` branches on source; new `createQueenForRecipientFromQueen`; `redistributeQueen` keys on `source_queen_id` when there is no graft; `deleteDistribution` tolerates a null graft |
| `src/components/batches/DistributeGraftModal.tsx` | Source-agnostic props + mutually-exclusive payload, source guards, title fallback |
| `src/app/dashboard/queens/[id]/page.tsx` | Split gate (`canRedistribute` / `canDistribute` / `canSendOn`), dual-path handler, modal wiring |
| `src/hooks/useQueenTracker.ts` | Left join, batch-id group scoping, nullable batch fields, donor queen + mother lookups |
| `src/components/batches/QueenTrackerTab.tsx` | Null-safe batch/cell/owner display and filters |
| `src/hooks/useReportsData.ts` | Left join + source queen embed for the failure report |

Database changes were applied via Supabase MCP migrations (no SQL file in `sql/`):
`distribute_registry_queen_schema`, `create_queen_for_distribution_queen_source`,
`promote_distributed_queen_on_mating_queen_source`,
`graft_distributions_source_queen_ownership_guard`,
`create_queen_for_distribution_unique_recipient_number`,
`create_queen_for_distribution_dedupe_number`.

## Known gaps

- **Self-distribution** of a registry queen mints a second queen record in your own register while
  marking the original `distributed`. The graft path behaves the same way.
- **`queen_marked`** is always `false` for registry rows in the Ledger — it is read from the graft,
  and a registry queen has none.
- **Deleting** a registry-queen distribution does not revert the donor queen from `distributed`
  (no UI currently exposes that deletion).
