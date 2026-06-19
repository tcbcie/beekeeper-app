# Distributed Queens — Hive Placement, Stage & Lifecycle

## Goal

When a queen **cell / virgin / mated queen** is distributed to an app user and assigned to a
destination apiary **hive**, it should:

1. appear in the recipient's **queen registry** clearly badged by **stage** (Cell / Virgin /
   Mated), and
2. be **placed into the destination hive** (the hive's current queen), and
3. carry all the **provenance details** that come across (mother queen, lineage, hatch/birth
   date, marking colour, subspecies, drone source), and
4. support the natural **lifecycle**: `Cell --(hatch day)--> Virgin --(mating)--> Mated`.

> Today the recipient queen record **is already created** with the lineage snapshot, but it is
> never placed in a hive, and **virgin vs mated is not distinguished** (both are `active`).

## Confirmed decisions

| Decision | Choice |
|---|---|
| Stage model | Add a new **`virgin`** queen status (Cell / Virgin / Mated=`active`) |
| Hive placement | **Auto-place** in the selected hive on distribution; a cell shows as **"Cell"** and is promoted on hatch day |
| Occupied hive | **Mark the old queen `superseded`**, then place the new one |
| Lifecycle | Include **both** promotions: Cell→Virgin (hatch day) and Virgin→Mated (mating) |
| Hatch day | **Manual** "Mark as emerged" date, **pre-filled** with the graft+~12d estimate |

## Schema facts (verified)

- `queens.status` has **no CHECK constraint** → adding `virgin` is code-only.
- `hives` columns available for placement: `queen_id`, `queen_installed_date`, `queen_marked`,
  `queen_marking_color`, `queen_mated`, `queen_clipped`, `queenless_reason`.
- A hive points to its current queen via `hives.queen_id`. Queen changes are auto-logged by the
  `track_hive_config_changes` trigger into `hive_configuration_history`.
- Recipient queen creation runs through the `SECURITY DEFINER` RPC
  `create_queen_for_distribution` (so it can write the recipient's account).

## Stage ⇄ status mapping

| Distribution type | Recipient queen status | Hive `queen_mated` |
|---|---|---|
| `queen_cell` | `cell` | false |
| `virgin_queen` | `virgin` *(new)* | false |
| `mated_queen` | `active` | true |

Lifecycle promotions happen two ways (both converge on the same recipient queen record):
- **Recipient, in their own account** (queen detail page): `cell → virgin` records the actual
  **hatch day** (updates `birth_date`); `virgin → active(mated)` records **mated date +
  location**, sets `status='active'`, `mated_date`, `mated_at_eircode`/`mating_station`, and flips
  the hive's `queen_mated=true`.
- **Breeder, from the Queen Tracker** (cross-account): confirming mating on a distribution
  auto-promotes the linked recipient queen `cell|virgin → active(mated)` and flips its hive's
  `queen_mated`. See Phase 6.

### Linking the recipient queen back to its source
To propagate reliably (no fuzzy `batch_id + queen_number` matching), add
`queens.source_graft_id uuid` (FK → `batch_grafts`, `ON DELETE SET NULL`), set at creation by
`create_queen_for_distribution`. A graft is distributed at most once, so this is a 1:1 link from
the recipient queen to its originating cell/distribution.

## Implementation — phased, each change small

### Phase 1 — `virgin` stage across the queen registry
- `src/types/queen.ts`: add `virgin` to the status label/colour helpers (new shared
  `QUEEN_STATUS` map if helpful).
- `src/app/dashboard/queens/page.tsx`:
  - status **filter** dropdown + `statusFilter` type → add `virgin`.
  - status **form** options (edit dialog) → add `virgin`.
  - status **badge** rendering → add a Virgin badge (e.g. blue).
  - **summary counts** → add a "Virgins" tally.
  - `STATUS_PRIORITY` sort → insert `virgin` between `cell` and `active`.

### Phase 2 — distribution sets the right stage + places in the hive
- `src/hooks/useGraftDistributions.ts`:
  - `createQueenForRecipient`: status map `queen_cell→cell`, `virgin_queen→virgin`,
    `mated_queen→active` (replaces the current `'cell' : 'active'`).
  - Thread `recipient_hive_id` from `createDistribution` →
    `createQueensForRecipient` → `createQueenForRecipient` → RPC param
    `p_recipient_hive_id`. **Single distributions only** (bulk passes null; bulk hive picker
    is already hidden).
- **RPC `create_queen_for_distribution`** (apply via Supabase MCP migration — no saved SQL
  file): add `p_recipient_hive_id uuid DEFAULT NULL`, `p_installed_date date DEFAULT NULL`, and
  `p_source_graft_id uuid DEFAULT NULL` (writes `queens.source_graft_id`).
  After inserting the queen, when `p_recipient_hive_id` is supplied **and the hive belongs to
  the recipient**:
  1. if that hive already has a queen owned by the recipient → set its `status='superseded'`;
  2. `UPDATE hives SET queen_id = <new>, queen_installed_date = COALESCE(p_installed_date,
     CURRENT_DATE), queen_marking_color = p_marking_color, queen_mated = (p_status='active'),
     queen_marked = false, queenless_reason = NULL WHERE id = p_recipient_hive_id AND user_id =
     p_recipient_user_id`.
  - All guarded by `user_id = p_recipient_user_id`; the trigger logs the change.

### Phase 3 — lifecycle promotions on the recipient's queen detail page
- `src/app/dashboard/queens/[id]/page.tsx` (recipient acts within their own account, no RPC):
  - `status='cell'` banner: add **"Mark as emerged"** → date input pre-filled with current
    `birth_date` estimate → sets `status='virgin'`, `birth_date=<hatch day>`. Keep existing
    "Mark as failed". (Optionally keep a direct "Mark as mated".)
  - `status='virgin'` banner: **"Mark as mated"** → mated date + location → `status='active'`,
    `mated_date`, `mated_at_eircode`/`mating_station`; also set the hive's `queen_mated=true`
    when the queen is assigned to a hive. Plus "Mark as failed".
  - status badge: render `virgin`.

### Phase 4 — hives show the queen's stage
- Update the hive detail / list (and dashboard summaries if they assume mated) to show a
  **stage badge** (Cell / Virgin / Mated) for the hive's current queen, so cells & virgins are
  visible — not only mated queens. *(Exact files TBD after a focused look at the hive views;
  verification step included.)*

### Phase 6 — breeder mating-confirmation propagates across accounts
- New column `queens.source_graft_id` (migration via Supabase MCP); set it in
  `create_queen_for_distribution` (Phase 2 already adds the param).
- New `SECURITY DEFINER` RPC `promote_distributed_queen_on_mating(p_distribution_id uuid,
  p_mated_date date)`:
  1. load the distribution; **verify `graft_distributions.user_id = auth.uid()`** (the caller is
     the breeder who owns it);
  2. find the recipient queen via `source_graft_id = <distribution.graft_id>` AND
     `user_id = <distribution.recipient_user_id>`;
  3. if found and `status IN ('cell','virgin')` → set `status='active'`, `mated_date`,
     and mating location (`mating_location`/eircode) from the distribution;
  4. if that queen is the current queen of a recipient hive → set the hive's `queen_mated=true`.
  - Every write guarded to the recipient's own rows; no-op if no linked queen (e.g. external
    recipient, or distribution predating this feature).
- Wire it into the confirmation path: after
  `setDistributionMatingConfirmation`/`useQueenTracker.updateMating` confirms, call the RPC
  (non-blocking, best-effort) with the confirmed mating date. Works for self-distributions too.
- **Un-confirm (revert mated→virgin):** out of scope for now — note only.

### Phase 7 — documentation
- Update `docs/features/batch-distributions.md`, `docs/features/queen-rearing.md`,
  `docs/features/queen-tracker.md` (or a new `docs/features/distributed-queen-hive-placement.md`)
  and cross-reference `distributed-queen-editable-lineage.md`.

## Out of scope (this iteration)
- Reverting a promotion when the breeder **un-confirms** mating (mated → virgin).
- Bulk hive placement (one hive, many grafts) — intentionally excluded.
- Re-homing / moving an already-placed queen between hives.

## Risks / things to verify
- Hive views currently assuming `queen_mated`/an active queen — must not break for cell/virgin.
- The supersede-on-place step must only ever touch the **recipient's** own queen/hive.
- `queen_installed_date` should reflect the distribution date (passed through), not birth date.
