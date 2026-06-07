# Plan: Structured Queen Lineage (standards-aligned pedigree)

Status: **Implemented (all 3 phases)** — 2026-06-07. See `docs/features/queen-lineage-pedigree.md`.
Author: Claude (Principal review) · Date: 2026-06-07

## Goal

Move the queen `lineage` from a hand-typed free-text blob to a **derived, standards-aligned
summary** generated from structured fields, while keeping a manual override. Aligns with the
BeeBreed (AGT), BIBBA/COLOSS BEEBOOK and Buckfast conventions, fitting an **open-mated native
AMM, mating-station** programme.

See research write-up in chat for sources. Core principles:
1. A bee pedigree is **Dam (one queen) × Drone source (a line OR a mating station + place + year)** — the sire is a population, not an individual.
2. Lineage should be **structured data**, with the human string *derived* from it (prevents drift/staleness, enables sort/search/tree).
3. **Performance data stays out of lineage** (it lives in inspections / performance notes).

## Canonical lineage grammar

```
<Dam> × <drone-source>[ @ <station>][ <eircode>] (<year>) · <subspecies> · Breeder: <name>
```

- `<Dam>` = `formatQueenSnapshot(...)` → e.g. `76-DA (Blue 2025 AMM)`
- `<drone-source>` from `drone_source_type`: `open-mated` | `station-mated` | `II` | (omitted if `unknown`)
- `@ <station>` only when a station is known (e.g. `TBKA Kilcornan`)
- `<eircode>` from `mated_at_eircode` (e.g. `H91RHH4`)
- `<year>` from `mated_date` (fallback birth year)
- `<subspecies>` **short form** e.g. `AMM` — derived by extracting the `(XXX)` abbreviation from the stored subspecies (`Apis mellifera mellifera (AMM)` → `AMM`); falls back to the raw value if no abbreviation present. Helper lives in `src/lib/lineage.ts`.
- `Breeder` = `distributed_by_name` (distributed) or the owner's profile name

Example: `76-DA (Blue 2025 AMM) × open-mated @ TBKA Kilcornan H91RHH4 (2026) · Breeder: Rico Zmarzly`

## Data model

`queens` already has: `mother_id`, `distributed_mother_queen`, `mated_at_eircode`,
`mated_date`, `subspecies`, `distributed_by_name`, `distributed_drone_source`, `lineage`,
`batch_id`, `father_id`.

**Add three columns** (migration):

| Column | Type | Notes |
|---|---|---|
| `drone_source_type` | `text` | `open` \| `station` \| `ii` \| `unknown`. Default `open`. CHECK constraint. |
| `mating_station` | `text` | Denormalised station name snapshot (e.g. `TBKA Kilcornan`). Nullable. |
| `lineage_overridden` | `boolean` | Default `false`. When true, never auto-regenerate `lineage`. |

No new dam/breeder columns — dam = `mother_id` (live link) ?? `distributed_mother_queen`
(snapshot); breeder = `distributed_by_name` ?? owner profile name.

## Single source of truth: `src/lib/lineage.ts`

```ts
export type DroneSourceType = 'open' | 'station' | 'ii' | 'unknown'

export interface LineageParts {
  damSnapshot?: string | null      // already formatted via formatQueenSnapshot
  droneSourceType?: DroneSourceType
  droneLine?: string | null        // only for 'ii' (optional drone/father line)
  matingStation?: string | null
  eircode?: string | null
  year?: number | string | null
  subspecies?: string | null
  breeder?: string | null
}

export function buildLineageString(p: LineageParts): string
```

- Pure, no I/O; reuses `formatQueenSnapshot` for the dam where needed.
- Used by **every** write path so the string is identical everywhere.

## Phases (each independently shippable, low blast radius)

### Phase 1 — Schema + derivation lib + backfill (no UX change)
1. Migration: add the 3 columns (+ CHECK on `drone_source_type`).
2. Add `src/lib/lineage.ts` with `buildLineageString` + `DroneSourceType`.
3. Backfill existing rows (data migration):
   - `drone_source_type`: parse `distributed_drone_source` — `Open-mated at …` → `open`; else default `open` (signed-off default; almost all stock is open-mated).
   - `mating_station`: parse the station from `distributed_drone_source` (`Open-mated at <X> (<eircode>)` → `<X>`), else from `batch_id → rearing_batches.mating_apiary → apiaries.name`.
   - Regenerate `lineage` from parts **only where `lineage_overridden = false`** (which is all, initially) so existing strings become consistent (also fixes the `n/a` class of issue at the source).
   - Set `lineage_overridden = false` for all (default).
4. Acceptance: list/detail/edit unchanged visually; `lineage` strings now consistent.

### Phase 2 — Form UX (queens/page.tsx)
1. Add **Drone source** `<select>` (Open-mated / Station-mated / Instrumental insemination / Unknown) bound to `drone_source_type`, defaulting to **Open-mated**.
2. Add **Mating station** as a **picker with free-text fallback** bound to `mating_station`:
   implemented as an `<input list=…>` datalist seeded from the user's apiaries / mating sites
   (already loadable in the page), so a known site can be picked or a new one typed.
3. Show **Father Queen** only when `drone_source_type === 'ii'` (meaningless for open mating; kept for controlled matings).
4. Make **Lineage** a derived, read-only preview by default, with an **"Edit manually"** toggle:
   - Not overridden → field is read-only, shows live `buildLineageString(...)` from current form values, regenerated on change; `lineage_overridden = false` saved.
   - Toggle on → field becomes editable; on save `lineage_overridden = true` and the typed text is kept verbatim.
5. `handleSubmit`: when not overridden, set `lineage = buildLineageString(...)`; persist `drone_source_type`, `mating_station`, `lineage_overridden`. (Distributed-queen field-stripping logic updated to allow these.)
6. Acceptance: editing a queen shows a live, correct lineage; manual override sticks.

### Phase 3 — Creation paths + display polish
1. `useGraftDistributions.ts → createQueenForRecipient`: set `drone_source_type` (from batch mating type), `mating_station` (`batch.mating_apiary_name`), and build `lineage` via `buildLineageString` (replaces the current ad-hoc `lineageParts`).
2. RPC `create_queen_for_distribution`: add `p_drone_source_type`, `p_mating_station` params (single new overload; the JS sends all named args so resolution stays unambiguous; drop the superseded overload as done previously).
3. Detail page: surface **Drone source** and **Mating station** as explicit rows in the provenance/genetics block (not only inside the lineage string).
4. Acceptance: newly distributed queens carry structured drone source + station + a derived lineage with no manual step.

## Files touched

- **DB**: 1 schema migration + 1 data backfill migration; Phase 3 RPC migration.
- `src/lib/lineage.ts` (new) — `buildLineageString`, `DroneSourceType`.
- `src/types/queen.ts` — add `drone_source_type`, `mating_station`, `lineage_overridden` to `Queen`/`QueenFormData`.
- `src/app/dashboard/queens/page.tsx` — form fields, derived lineage + override, `handleSubmit`/`handleEdit`.
- `src/hooks/useGraftDistributions.ts` — set structured fields, derive lineage.
- `src/app/dashboard/queens/[id]/page.tsx` — show drone source / station rows.
- Docs: `docs/features/distributed-queen-editable-lineage.md` + new `docs/features/queen-lineage.md`.

## Risks & mitigations

- **Clobbering manual lineage**: guarded by `lineage_overridden`; backfill treats all as
  non-overridden (existing strings are machine-generated anyway), but we snapshot before
  regenerating and can re-run.
- **Cross-user staleness**: dam/station/breeder are snapshots for distributed queens (correct
  for cross-user); live link preferred when the dam is local.
- **RPC overload churn**: add params in one migration, drop the superseded signature (precedent set).
- **Scope creep**: a full BeeBreed composite code (`IE-RZ-07-2026`) and multi-generation string
  are **out of scope** here — the tree already covers multi-generation; the code can be a later
  add.

## Out of scope (future)

- Full international composite queen code as a first-class unique identifier.
- Instrumental-insemination drone-line management beyond a single optional field.
- Mating-station registry (currently free text / batch apiary).

## Decisions (signed off 2026-06-07)

1. **Default drone source = `open`** (open-mated) for existing/own queens with no recorded signal.
2. **Mating station = picker with free-text fallback** (datalist seeded from the user's apiaries / mating sites).
3. **Father Queen shown only when drone source = Instrumental insemination**; hidden otherwise.
4. **Subspecies rendered short** (`AMM`) in the lineage string, via abbreviation extraction.
