# Queen Assignment History (+ View Batch deep-link fix)

**Status:** Implemented
**Area:** Queen detail page, hives & mating-nucs write paths, new DB table + triggers, batches page.

This document covers two things requested together:
1. **Queen assignment history** — record and show where a queen has lived over
   time (parked in a mating nuc to mature → moved into a production hive →
   moved to another production hive → parked again, etc.).
2. **View Batch link fix** — the "View Batch" links currently always open the
   main batches list instead of the specific batch.

---

## 1. Queen Assignment History

### Decisions (confirmed)
- **Capture:** database triggers on `hives` and `mating_nucs` write to a new
  `queen_assignments` table automatically. Production = a hive; parked/maturing
  = a mating nuc.
- **Manual edits:** the overview timeline also allows adding / editing / deleting
  entries by hand (for back-filling older moves).
- **Back-fill:** seed the table from existing data on rollout (current
  hive/nuc occupants + past hive moves from `hive_configuration_history`).

### Data model — new table `queen_assignments`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `queen_id` | uuid NOT NULL | FK → `queens(id)` ON DELETE CASCADE |
| `location_type` | text NOT NULL | `'hive'` (production) or `'nuc'` (parked) |
| `hive_id` | uuid NULL | FK → `hives(id)` ON DELETE SET NULL |
| `mating_nuc_id` | uuid NULL | FK → `mating_nucs(id)` ON DELETE SET NULL |
| `apiary_id` | uuid NULL | snapshot (hive's apiary; null for nucs) |
| `location_label` | text NULL | snapshot of `hive_number` / `nuc_number` (survives renames/deletes) |
| `started_at` | timestamptz NOT NULL | default `now()` |
| `ended_at` | timestamptz NULL | `null` = current location |
| `source` | text NOT NULL | `'system'` \| `'manual'` \| `'backfill'` |
| `notes` | text NULL | free text |
| `user_id` | uuid NOT NULL | owner (for RLS) |
| `created_at` | timestamptz NOT NULL | default `now()` |

Indexes / invariants:
- `INDEX (queen_id, started_at DESC)` for timeline reads.
- `UNIQUE (queen_id) WHERE ended_at IS NULL` — a queen has at most one *current*
  location at a time.

RLS: enable; owner-only `SELECT/INSERT/UPDATE/DELETE` where `user_id = auth.uid()`.

### Triggers (SECURITY DEFINER, `search_path = public`)
A shared helper opens/closes intervals so the one-open-per-queen invariant holds:

- **On `hives`** — `AFTER INSERT OR UPDATE OF queen_id OR DELETE`:
  - If the *old* queen left this hive (queen_id cleared/changed or row deleted):
    close her open assignment for this hive (`ended_at = now()`).
  - If a *new* queen arrived (queen_id set/changed): close any other open
    assignment she had (she moved), then insert a fresh open `'hive'` row
    (`hive_id`, `apiary_id` = hive's apiary, `location_label` = hive_number).
- **On `mating_nucs`** — same pattern with `location_type = 'nuc'`,
  `mating_nuc_id`, `location_label = nuc_number`, `apiary_id = null`.

Guards: only act when `queen_id` actually changed; never write a row when old =
new. Triggers must close before insert so the partial-unique index isn't violated.

> Note: hive changes are *already* logged to `hive_configuration_history`; that
> log stays as-is. The new triggers are queen-centric and additionally cover nucs.

### Back-fill (one-off, on migration)
- For every hive with a current `queen_id`: open a `'hive'` row
  (`started_at` = `queen_installed_date` if present, else hive history's earliest
  relevant change, else `created_at`), `source = 'backfill'`.
- For every mating nuc with a current `queen_id`: open a `'nuc'` row similarly.
- Past production moves: walk `hive_configuration_history` per hive in time
  order; each `queen_id` transition yields a closed `'hive'` interval
  (`source = 'backfill'`). Best-effort; gaps are acceptable.

### UI — Queen overview "Assignment History"
- New hook `src/hooks/useQueenAssignments.ts`: fetch (newest first), add, edit,
  delete (owner-only; manual rows `source = 'manual'`).
- New component `src/components/queens/QueenAssignmentHistory.tsx`: a vertical
  timeline on the Overview tab (below the Provenance box / Assignment block).
  Each row shows:
  - location label (links to the hive or nuc) + a **Parked**/**Production** tag
    (`nuc` = Parked, `hive` = Production),
  - apiary (when known),
  - date range `started → ended` (or **Current**) + duration,
  - notes; plus edit/delete for manual control.
- An **Add entry** button opens a small `ModalShell` form (location type, hive or
  nuc, dates, notes).
- Large text / clear tags for the 50+ low-vision audience.

### Files (history)
- DB migration via Supabase MCP (`apply_migration`): table + index + RLS +
  trigger functions/triggers + back-fill.
- `src/types/queen.ts` — `QueenAssignment` interface.
- `src/hooks/useQueenAssignments.ts` — new.
- `src/components/queens/QueenAssignmentHistory.tsx` — new.
- `src/app/dashboard/queens/[id]/page.tsx` — render the timeline on Overview.

---

## 2. View Batch deep-link fix

### Root cause
- `src/app/dashboard/queens/[id]/page.tsx` (~line 583) and
  `src/components/queens/QueenReportTab.tsx` (~line 174) both hard-code
  `href="/dashboard/batches"` with **no id**.
- There is no `/dashboard/batches/[id]` route — all batches render on the single
  `/dashboard/batches` page, which already reads `?tab=` via `useSearchParams()`.

### Fix (no new route)
1. **Batches page** — also read `searchParams.get('batch')`. After batches load,
   if a `batch` id is present, switch to the Grafting Batch tab and open that
   batch (call the existing `handleEdit(matchingBatch)`), so the specific batch's
   detail/form is shown. No-op if the id isn't found (or it's another breeder's).
2. **Queen overview & report links** — point at
   `/dashboard/batches?batch=${queen.batch.id}` (uses the existing
   `queen.batch.id` UUID, already loaded by `useQueenDetail`).

> The amber "Distributed Queen — Provenance" box keeps showing
> `distributed_batch_name` as plain text — that batch belongs to another breeder
> and has no local page, so it stays unlinked.

---

## Out of scope
- A full standalone batch detail route (the deep-link reuses the existing page).
- Changing how queens are assigned (the hive/nuc forms are unchanged; we only
  observe their writes via triggers).
