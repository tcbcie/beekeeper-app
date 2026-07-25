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
- **Subspecies** is editable (also for distributed queens) and auto-fills from the linked
  mother when blank, so it follows the maternal line.
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

A BeeBreed-style composite identifier: `Country-Breeder-QueenNumber-Year`, e.g. `IE-RZ-7W-2026`.

- `src/lib/queen-code.ts` — `buildQueenCode()`, `queenCodeFor(queen, breederContext)`, `initialsFromName()`. Derived, not stored.
- **Country**: `IE` / `GB` from the owner profile's `is_uk_ni_resident`; **omitted** for
  distributed queens (the breeder's country is unknown to the recipient).
- **Breeder**: the breeder's **registered code** when set (`profiles.breeder_code`), else
  initials of the name — matching the `RZ` convention in batch names like `TQRQB_RZ01`. For
  distributed queens the original `distributed_by_name` drives the initials.
- **Queen number** and **year** (birth year) complete the code.

**Breeder/reference queens** (`queen_role !== 'production'`) are breeding stock, often an
external line, so their code is built from `origin_breeder_code` with the country omitted
(`UG-UGMul1.8-2025`), or number-only when no origin is set — never the owner's `IE-RZ`. See
[breeder-reference-queens-plan.md](../feature/breeder-reference-queens-plan.md).

Surfaced on: the queen **detail page** (chip beside the number), the queens **list** (under
the queen number), and printed **queen labels** (`queenToLabelDatum(queen, breederContext)` →
`QueenLabelExtras.code`, rendered in `Label.tsx` and `printHtml.ts`).

**Ownership rule**: the breeder context passed to `queenCodeFor` must belong to the queen's
owner. Callers pass it only for queens the viewer owns (`queen.user_id === viewer` /
`isOwner`); for shared home-bred queens owned by another beekeeper the context is `null` and
no code is shown, so the viewer's identity is never stamped onto someone else's queen.
Distributed queens always show a code (breeder comes from `distributed_by_name`). The year is
parsed from the date string (`fullYearFromDate`), not `Date()`, to avoid a timezone off-by-one.

### Breeder code setting

`profiles.breeder_code` (migration `profiles_add_breeder_code`) is editable on the **profile**
page. Optional; when set it replaces name initials so two breeders with the same initials do
not collide.

**App-wide uniqueness**: a case-insensitive partial unique index
(`profiles_breeder_code_unique_idx` on `upper(breeder_code) WHERE breeder_code IS NOT NULL`)
guarantees no two accounts share a code (NULLs allowed). The profile save pre-checks via the
`is_breeder_code_available(p_code)` `SECURITY DEFINER` RPC (so it can see across accounts
despite profiles RLS) for a friendly message, and also handles the `23505` unique violation
as a race fallback.

## Reared queens as lineage mothers (added later)

A queen reared and distributed **externally** (public/non-app recipient) never gets a `queens`
register record — it lives only in the queen tracker — so it could not be chosen as a **Mother
Queen**, breaking the maternal line for any daughter kept locally.

The Mother Queen dropdown in the queen form now offers a **"Reared (from tracker)"** optgroup listing
the user's distributed reared queens that are not yet in the register (option value `graft:<id>`).
Selecting one and saving calls the **`ensure_reared_queen_record(p_graft_id)`** RPC, which idempotently
(on `user_id, source_graft_id`) creates a **breeder** register record (`status='distributed'`) for that
queen — deriving her number, marking colour, subspecies, birth date, and **her own mother** (the cell
breeder: `batch_grafts.breeder_queen_id` ?? `rearing_batches.mother_queen_id`) from the graft — and
links the daughter's `mother_id` to it, restoring full ancestor traversal. See
[queen-lineage-reared-mother-plan.md](../feature/queen-lineage-reared-mother-plan.md). The RPC is
`SECURITY DEFINER`, self-scoped via `auth.uid()`, and exists **only in Supabase** (MCP migration,
no SQL file).

## Out of scope (future)

- Association-assigned breeder registry numbers (the code is currently user-chosen).
- Multi-generation lineage in the string (the genealogy tree already covers ancestry/descendants).
- Mating-station registry beyond free text / apiary names.
