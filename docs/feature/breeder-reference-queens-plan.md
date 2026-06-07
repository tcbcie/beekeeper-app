# Plan: Breeder (reference) queens

Status: **Implemented (both phases)** — 2026-06-07.
Date: 2026-06-07

## Problem

Some queen records are **breeding stock / graft-source dams**, not colonies the user manages
(e.g. all `UG…` queens: `UGMul1.8`, `UGX1.4`, `UGMul1.6x`, `UGMul1.3`). In the data they are:
no hive, no mother of their own (top of the pedigree tree), AMM, status `active`.

Today they are indistinguishable from production queens, which causes three problems:
1. **They clutter the production list** and are counted in the "Active" total + average age.
2. **No visual marker** — you can't tell a stud dam from a working colony.
3. **Mis-attributed identity** — their composite code reads `IE-RZ-UGMul1.8-2025`, asserting RZ
   as the breeder even though `UG…` is clearly an external line; and the number already
   carries `UG`, so the breeder segment is redundant/wrong.

## Proposed concept

Introduce a **queen role**: a queen is either a **production** queen (heads a managed colony)
or a **breeder / reference** queen (breeding stock used as a graft-source dam). Optionally
capture **origin** for breeder queens acquired from another line.

### A. Data model

- `queens.is_breeder_queen boolean NOT NULL DEFAULT false` — the role flag. (A boolean is
  simplest; a `queen_role` enum is the alternative if more roles are foreseen.)
- *(if acquired-origin matters)* `queens.origin_breeder_code text` — the originating line/
  breeder code (e.g. `UG`), used for the breeder queen's own composite code and rolled into
  the lineage of her offspring.

### B. Identification in the list / detail

- A **"Breeder" badge** beside the queen number (list + detail header).
- **Excluded from production stats** — the "Active" count and average age cover production
  queens only; breeder queens get their own small count ("+ N breeder queens").
- **Filter** — extend the existing scope/status filters with a role filter
  (`Production` / `Breeder` / `All`); default hides breeder queens from the production view.
- Breeder queens have no hive/apiary, so those columns naturally read `N/A`.

### C. Auto-tagging (migration)

Seed `is_breeder_queen = true` for strong candidates: queens that are **not in any hive** AND
are referenced as a **graft/batch mother** or as the **`mother_id` of another queen**. The
`UG…` set matches this. (Presented for confirmation; reversible per-queen on the edit form.)

### D. Lineage & composite code rolling into offspring

This is the standards question (BeeBreed/Buckfast): a queen's own code reflects **who bred
her**; her offspring's code reflects **who bred the offspring**; the pedigree string references
the dam by her code.

- **Offspring** (e.g. `6W`, daughter of `UGMul1.8`): keeps her own code `IE-RZ-6W-2026`
  (RZ bred her) — unchanged. Her lineage already names the dam.
- **Breeder queen** (`UGMul1.8`): her code should reflect **origin**, not the current owner.
  Options (decision below):
  - *Origin code*: `IE-UG-Mul1.8-2025` (breeder segment = origin `UG`).
  - *Number-only*: `UGMul1.8-2025` (the number is the line identifier; drop the owner prefix).
  - *Leave as-is*: keep `IE-RZ-…` (treat them as RZ's own stock).
- **Lineage of offspring** then carries the dam's true origin (e.g. `Dam: UGMul1.8 (UG line, …)`),
  so provenance is honest end-to-end.

## Phasing

1. Schema + role flag + auto-tag migration; badge + stat exclusion + filter (no behavioural risk).
2. Origin attribution (if chosen) + composite-code adjustment for breeder queens + lineage roll-through.

## Decisions (signed off 2026-06-07)

1. **Model = `queen_role` enum**: `production` (default) | `breeder` | `reference` | `drone_source`.
   Production vs non-production drives stats/badge; the extra values are future headroom.
2. **List = always shown + badge** (no hiding). Non-production queens carry a role badge and are
   **excluded from the production stats** (Active count, average age). A role filter is added but
   defaults to "All" so nothing is hidden by default.
3. **Origin = acquired/external**: add `queens.origin_breeder_code`. Non-production queens use the
   **origin** for their composite code (country omitted) instead of the owner's `IE-RZ`:
   - with origin set → `UG-UGMul1.8-2025`;
   - without origin → number-only `UGMul1.8-2025` (never the false `IE-RZ-…`).
   Offspring keep their own owner code (`IE-RZ-6W-2026`); the dam (with her origin) is referenced
   in the offspring lineage.
4. **Auto-tag = yes**: migration sets `queen_role='breeder'` for queens **not in any hive** that are
   a **graft/batch mother** or another queen's **`mother_id`**. Reversible on the edit form.

## Implementation outline (locked)

**DB**
- Migration `queens_add_role_and_origin`: `queen_role text NOT NULL DEFAULT 'production'` (CHECK in
  the 4 values) + `origin_breeder_code text`.
- Data migration: auto-tag breeder queens per decision 4.

**Types** — add `queen_role`, `origin_breeder_code` to `Queen` + `QueenFormData`.

**`src/lib/queen-code.ts`** — `queenCodeFor`: when `queen_role !== 'production'`, build from
origin code (country omitted), never the owner; production path unchanged.

**Edit form (`queens/page.tsx`)** — Queen Role select; Origin Breeder Code input (shown for
non-production); both persisted (incl. distributed queens).

**List (`queens/page.tsx`)** — role badge; production-only Active count + avg age; role filter
(default All); composite code already routes through `queenCodeFor`.

**Detail (`queens/[id]/page.tsx`)** — role badge + origin row; composite code via `queenCodeFor`.

**Phasing**: 1) schema + auto-tag + badge + stats + filter; 2) origin code + composite-code routing.
