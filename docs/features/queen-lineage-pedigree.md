# Queen Lineage — Structured Pedigree

Queen `lineage` is a **derived** pedigree string generated from structured fields, following
the BeeBreed / BIBBA / Buckfast convention that the sire is a *population* (mating method +
station), not a single father. (See also [queen-lineage.md](queen-lineage.md) for the visual tree.)

## Canonical grammar

```
<Dam> × <drone-source>[ @ <station>][ <eircode>] (<year>) · <subspecies-short> · Breeder: <name>
```

Example: `76-DA (Blue 2025 AMM) × open-mated @ TBKA Kilcornan H91RHH4 (2026) · AMM · Breeder: Rico Zmarzly`

- **Dam** — local mother queen (FK) when linked, else the `distributed_mother_queen` snapshot; subspecies inside is shortened (`Apis mellifera mellifera (AMM)` → `AMM`).
- **drone-source** — from `drone_source_type`: `open-mated` | `station-mated` | `II` | (omitted if `unknown`).
- **station** — `mating_station`; **eircode** — `mated_at_eircode`; **year** — `mated_date` (fallback birth year).
- **subspecies** — the queen's own, short form. **Breeder** — `distributed_by_name` (distributed) or implicit owner.

## Single source of truth

`src/lib/lineage.ts`:
- `buildLineageString(parts)` — the only place the string is assembled.
- `DroneSourceType`, `DRONE_SOURCE_OPTIONS`.
- `shortSubspecies`, `shortenSubspeciesInText`, `lineageYear`, `damLabelFromQueen`, `damLabelFromSnapshot`.

Used by both the edit form (`queens/page.tsx → deriveLineage`) and the distribution path
(`useGraftDistributions.ts`) so the string is identical everywhere.

## Data model (`queens`)

New columns (migration `queens_add_structured_lineage_columns`):
- `drone_source_type text` — `open` | `station` | `ii` | `unknown` (CHECK), default `open`.
- `mating_station text` — denormalised station snapshot.
- `lineage_overridden boolean` — when true, `lineage` is never auto-regenerated.

Reused: `mother_id` / `distributed_mother_queen` (dam), `father_id` (drone line, II only),
`mated_at_eircode`, `mated_date`, `subspecies`, `distributed_by_name` (breeder).

## Behaviour

**Edit form** (`queens/page.tsx`):
- **Drone Source** select (default Open-mated).
- **Mating Station** = datalist picker (apiaries / mating sites + previously-used stations) with free-text fallback.
- **Father Queen** shown only when drone source = Instrumental insemination.
- **Lineage** is a live, read-only preview of `buildLineageString(...)`. Tick **Edit manually** to override (sets `lineage_overridden`); the typed text is then kept verbatim.

**Creation (distribution)**: `createQueenForRecipient` sets `drone_source_type='open'`,
`mating_station = batch mating apiary`, and derives `lineage` via the shared builder. The RPC
`create_queen_for_distribution` gained `p_drone_source_type` + `p_mating_station` (validated
server-side; replaces the prior 15-arg overload).

**Detail page** (`queens/[id]`): shows **Drone source** and **Mating station** rows; the
**Father** row is hidden unless II (or a father is already recorded).

## Backfill (applied)

- Existing distributed queens: `mating_station` parsed from `distributed_drone_source`, and
  `lineage` regenerated to the canonical format (matching `buildLineageString`).
- Existing home-bred queens with a hand-typed lineage: `lineage_overridden = true` so a future
  save does not clobber the manual text.

## Composite queen code

A BeeBreed-style composite identifier is shown on the queen **detail page** beside the queen
number: `Country-BreederInitials-QueenNumber-Year`, e.g. `IE-RZ-7W-2026`.

- `src/lib/queen-code.ts → buildQueenCode()` (+ `initialsFromName`). Derived, not stored.
- **Country**: `IE` / `GB` from the owner profile's `is_uk_ni_resident`; **omitted** for
  distributed queens (the breeder's country is unknown to the recipient).
- **Breeder initials**: from `distributed_by_name` for distributed queens, else the owner's
  profile name — matching the `RZ` convention in batch names like `TQRQB_RZ01`.
- **Queen number** and **year** (birth year) complete the code.

## Out of scope (future)

- A registered/unique breeder number (current code uses name initials, which can collide).
- Showing the composite code in the queens list / on printed labels.
- Multi-generation lineage in the string (the genealogy tree already covers ancestry/descendants).
- Mating-station registry beyond free text / apiary names.
