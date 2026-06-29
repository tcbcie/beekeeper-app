# Distributed Queens — Hive Placement, Stage & Lifecycle

When a queen **cell / virgin / mated queen** is distributed to an app user and a destination
**hive** is selected, the recipient gets a queen record that is placed into that hive, clearly
badged by stage, with full provenance — and the queen progresses through her lifecycle.

```
Cell ──(hatch day)──► Virgin ──(mating)──► Mated
```

## Stage model

A new queen status **`virgin`** sits between `cell` and `active` (mated/laying):

| Distribution type | Recipient queen status | Hive `queen_mated` |
|---|---|---|
| `queen_cell` | `cell` | false |
| `virgin_queen` | `virgin` | false |
| `mated_queen` | `active` | true |

`queens.status` has no DB CHECK constraint, so `virgin` needed no migration. It is surfaced
across the queen registry (filter, edit form, status badge, summary counts, sort order), the
queen detail page badge, and the hive views (Stage badge). Badge colours: Cell = amber,
Virgin = blue, Mated/Active = green.

## Hive placement on distribution

`DistributeGraftModal` already lets you pick the recipient's apiary + (optional) hive for a
single distribution. On save, `create_queen_for_distribution` (SECURITY DEFINER RPC) now:

- writes `queens.source_graft_id` (FK → `batch_grafts`) — a 1:1 link from the recipient queen
  back to its originating cell, used for lifecycle propagation;
- when a destination hive is supplied **and it belongs to the recipient**, places the new queen
  into it: supersedes any queen currently in that hive (sets it `superseded`), then sets
  `hives.queen_id`, `queen_installed_date` (= distribution date), `queen_marking_color`,
  `queen_mated` (true only for mated), and clears `queenless_reason`.

All hive/queen writes are guarded to the recipient's own rows. The hive-config-history trigger
logs the change automatically. Bulk distribution never auto-places (one hive can't hold many).

### Duplicate prevention (one graft → one queen per account)

The RPC is **idempotent**: a graft may only ever produce a single queen per account. Before
inserting, it looks up an existing queen by `(recipient_user_id, source_graft_id)` and reuses it
if found; the `INSERT` also carries `ON CONFLICT (user_id, source_graft_id) … DO NOTHING` and
re-selects on a lost race. A partial unique index
`queens_user_source_graft_unique (user_id, source_graft_id) WHERE source_graft_id IS NOT NULL`
is the hard backstop at the DB level. This prevents the historical bug where re-running a
(self-)distribution — double submit, re-confirm, or a backfill re-run — created a second queen
record and left the first orphaned/superseded. Both RPC overloads (with and without
`p_recipient_apiary_id`) carry the guard so a stale PWA-cached client cannot duplicate either.

## Lifecycle promotions

**Recipient, on their own queen detail page** (`queens/[id]`):
- **Mark as emerged** (cells): records the actual **hatch day** (pre-filled with the graft+~12d
  estimate), sets `status='virgin'`.
- **Mark as mated** (cells or virgins): records mated date + Eircode, sets `status='active'`,
  and flips the queen's hive to `queen_mated=true`.
- **Mark as failed** (cells or virgins): sets `status='dead'`.

**Breeder, from the Queen Tracker** (cross-account): confirming mating on a distribution calls
`promote_distributed_queen_on_mating(distribution_id, mated_date)` (SECURITY DEFINER). It:
1. verifies the caller owns the distribution;
2. finds the recipient queen via `source_graft_id` (still `cell`/`virgin`);
3. promotes it to `active` with the mated date/location;
4. flips its hive to `queen_mated=true`.
Best-effort and idempotent; a no-op for external recipients or pre-feature distributions. Works
for self-distributions too (breeder == recipient).

## Files

- `src/app/dashboard/queens/page.tsx` — `virgin` in filter, form, badge, counts, sort.
- `src/app/dashboard/queens/[id]/page.tsx` — emerged/mated/failed lifecycle actions + badge.
- `src/hooks/useGraftDistributions.ts` — stage mapping, thread `recipient_hive_id`/installed
  date/source graft to the RPC, and propagate mating confirmation.
- `src/app/dashboard/hives/[id]/page.tsx`, `src/components/hive/HiveListCard.tsx`,
  `src/app/dashboard/hives/page.tsx` — Stage badge + virgins assignable.
- DB (via Supabase MCP): `queens.source_graft_id`; extended `create_queen_for_distribution`;
  new `promote_distributed_queen_on_mating`.

## Out of scope
- Reverting a promotion when the breeder **un-confirms** mating (mated → virgin).
- Bulk hive placement; moving an already-placed queen between hives.

See also: [batch-distributions.md](batch-distributions.md),
[distributed-queen-editable-lineage.md](distributed-queen-editable-lineage.md),
[queen-tracker.md](queen-tracker.md).
