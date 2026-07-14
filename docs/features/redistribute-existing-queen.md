# Redistribute an Existing Queen

## Problem

A queen bred/distributed from a graft (e.g. 38W) may be **self-distributed** — the breeder
keeps it, puts it in a hive or nuc to mature — and later wants to hand it on to another
beekeeper. There was no way to do this: distribution is modelled at the **graft** level
(`DistributeGraftModal` → `graft_distributions` → mints a queen in the recipient's account),
and the Queen Tracker is one row per graft.

## Key constraint

`graft_distributions` has `UNIQUE (graft_id)` — **one distribution row per graft**. So a
redistribution cannot be a second row; it **re-points the existing row** to the new recipient.
This is acceptable because the original self-distribution was really "kept to mature", and the
Queen Tracker should show the queen's *current* owner.

## Approach (reuse the existing modal)

1. **Queen detail page** gains a **"Redistribute"** action (owner only, when the queen has a
   `source_graft_id` + `batch_id` and status is `active` or `virgin`). It opens the existing
   `DistributeGraftModal` seeded with the queen's graft.
2. `DistributeGraftModal` gains two optional props:
   - `distributionTypeOverride` — the graft status is now `sold` (maps to `queen_cell`, wrong),
     so we force `mated_queen` (active queen) / `virgin_queen` (virgin) from the queen's status.
   - `titleOverride` — show "Redistribute Queen 38W" instead of "Distribute Cell #N".
3. **`redistributeQueen(data)`** in `useGraftDistributions`:
   - **UPDATEs** the single `graft_distributions` row for that graft with the new recipient,
     `distribution_date`, notes, CRM link. It **preserves `mating_confirmed` /
     `mating_confirmed_date`** so the recipient's minted queen inherits the *original* mated date
     (`create_queen_for_distribution` reads `mated_date` from this row).
   - For an **app-user** recipient, reuses `createQueensForRecipient` (same path as first-time
     distribution → mints the queen, optional hive placement, lineage, mated_date). For an
     **external** beekeeper it's record-only (no account).
4. **Outgoing side** — after a successful redistribution the breeder's own queen is marked
   `status = 'distributed'` and **detached from its hive** (`hives.queen_id = null`, hive flagged
   queenless). A `'distributed'` queen drops out of the default "Active" queen view/count.

## Data model

- New queen status value **`'distributed'`** (no DB migration — `queens.status` has no CHECK
  constraint). Added to the status badge helper and the queens-list status filter.
- No schema change to `graft_distributions` (the `UNIQUE(graft_id)` stays).

## Queen Tracker

No changes. The tracker reads `graft_distributions`; because we update that row, the tracker row
automatically shows the new recipient and keeps the queen's outcome history.

## Files touched

| File | Change |
|------|--------|
| `src/types/queen.ts` | `'distributed'` badge colour in `queenStatusBadgeClass` |
| `src/components/batches/DistributeGraftModal.tsx` | `distributionTypeOverride`, `titleOverride` props |
| `src/hooks/useGraftDistributions.ts` | `redistributeQueen()` (update row + mint recipient queen) |
| `src/app/dashboard/queens/[id]/page.tsx` | Redistribute button + modal + mark-distributed/detach-hive handler |
| `src/app/dashboard/queens/page.tsx` | `'distributed'` status filter option + badge label |

## Out of scope

- Queens with no `source_graft_id` (e.g. caught swarms) — they have no graft/distribution to
  re-point; would need a separate queen-transfer table.
- Multi-hop history — re-pointing overwrites the previous (self) recipient rather than keeping a
  full ledger of every hand-off.

## Todo

- [x] 1. `'distributed'` badge in `queen.ts`.
- [x] 2. Modal `distributionTypeOverride` + `titleOverride`.
- [x] 3. `redistributeQueen()` in the hook.
- [x] 4. Queen detail: button, modal wiring, mark-distributed + hive detach.
- [x] 5. Queens list: `'distributed'` filter option + badge.
- [ ] 6. User to test.

## Review

### Changes made

- **`src/types/queen.ts`** — `'distributed'` (slate) branch in `queenStatusBadgeClass`.
- **`src/components/batches/DistributeGraftModal.tsx`** — optional `distributionTypeOverride`
  and `titleOverride` props; type inference and title now respect them.
- **`src/hooks/useGraftDistributions.ts`** — `redistributeQueen(data)` UPDATEs the graft's single
  distribution row to the new recipient (preserving mating confirmation) and mints the recipient's
  queen via the existing `createQueensForRecipient`; exported from the hook.
- **`src/app/dashboard/queens/[id]/page.tsx`** — "Redistribute" header button (owner + graft-sourced
  + active/virgin), opens `DistributeGraftModal`; on success marks the local queen `distributed` and
  detaches it from its hive; `'distributed'` badge label/colour added.
- **`src/app/dashboard/queens/page.tsx`** — `'distributed'` status-filter option + row badge.

No DB migration (`queens.status` has no CHECK constraint; `graft_distributions` unchanged).
`tsc` and `eslint` clean on all changed files.

### Follow-up — mating location not mandatory for mated queens

`DistributeGraftModal` previously required an apiary or mating location for **every** app-user
distribution. Redistributing an already-mated queen (which carries its recorded mating data)
was blocked by "Please select an apiary or enter a mating location". The requirement now applies
only to **unmated** queens (`cell` / `virgin`), which genuinely need a destination where they will
mate; for `mated_queen` the field stays visible but optional (still pre-filled and editable in the
normal mated-distribution flow, so no regression there).

### To verify (user)

- Open queen 38W → tap the Redistribute (send) icon → pick an app user or external beekeeper → save.
- 38W's status becomes **Distributed** and it drops off its hive; it disappears from the default
  "Active" queens view (filter to "Distributed" to see it).
- Queen Tracker row for that graft now shows the new recipient.
- If the recipient is an app user, a queen appears in their account with the original mated date.
