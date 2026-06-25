# Planner: smarter apiary default + data-availability crop picker

> **Status:** Plan (awaiting verification). No database changes.

## Why

The planner defaulted to the **alphabetically-first** apiary (e.g. *AP01 – Colm*), which often has
sparse bloom data. A user can then pick a crop (e.g. Blackberry) that has **no observation at that
apiary**, so the resolver silently falls back to the generic **Tier-3 estimate** — showing
misleading "typical GDD" dates with no obvious signal that real data wasn't used.

Two pieces of guidance fix this:

1. **Default to the most-recorded apiary** — the user's main data site — instead of alphabetical.
2. **Colour-code each crop in the picker** by the data tier it would resolve to at the selected
   apiary, so it's obvious which crops use real observations vs a generic estimate.

## Decisions

| Area | Decision |
|------|----------|
| Apiary default | Apiary with the **most bloom records** for the user (no location prompt); fall back to first if none |
| Crop picker | **Custom styled dropdown** (native `<option>` colours are unreliable on iOS Safari) |
| Colour scheme | Reuse the existing tier palette: green = observed, blue = projected, amber = estimated, grey = none |
| Resolver logic | **Unchanged** — still apiary-scoped; this is guidance only, not cross-apiary borrowing |

## Crop data level (per crop, at the selected apiary)

Computed cheaply alongside `vegOptions` (no full resolve):

- **observed** — a record this season with a start date (Tier 1)
- **projected** — any prior record with a GDD value (Tier 2)
- **estimated** — no records, but `vegetation_info.typical_gdd_range` exists (Tier 3)
- **none** — nothing to go on

## Custom dropdown (`CropSelect`)

- A button showing the selected crop with its colour dot; opens a popup `listbox`.
- Each row: colour dot + crop name + a small tier word ("observed" / "estimated" …); large,
  high-contrast targets for the 50+ audience.
- Accessible: `role="listbox"`/`option`, `aria-selected`, `aria-expanded`; close on outside-click and
  Escape; keyboard open/select. Follows the existing `role="listbox"` pattern in the codebase.
- A short legend under the pickers explains the colours.

## Files to change

| File | Change |
|------|--------|
| `src/hooks/useTbrPlanner.ts` | Count records per apiary on load → default to the most-recorded apiary; add `dataLevel` to each `VegOption` |
| `src/components/tools/TBRPlanner.tsx` | New `CropSelect` custom dropdown; colour-coded rows + legend; replace the two native crop `<select>`s |

No DB changes. No new dependencies.

## Out of scope

- Device geolocation / nearest-by-distance (no stored home location; deferred).
- Cross-apiary observation borrowing (resolver stays apiary-scoped).
