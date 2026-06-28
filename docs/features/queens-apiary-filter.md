# Queens — Apiary Filter

**Status:** Implemented
**Area:** Queens list page — `src/app/dashboard/queens/page.tsx`

## Goal
Let the beekeeper filter the queens list by apiary, alongside the existing
Ownership / Status / Assignment / Role filters.

## How it works
- A queen's apiary is derived from her assigned hive (`queen.hives.apiaries`).
  The hive lookup now also selects the apiary `id` so filtering is exact.
- A new **Apiary** dropdown (`All Apiaries` + one option per apiary) sits at the
  end of the filter bar. Its options are built from the apiaries actually present
  among the loaded queens — no extra fetch — so the list always matches the data
  and never shows empty apiaries.
- Filtering is client-side, added to the existing `filteredQueens` computation:
  a queen passes when `All Apiaries` is selected, or when her assigned hive's
  apiary id matches the chosen one. Unassigned queens (no apiary) are naturally
  excluded while a specific apiary is selected.
- The selection persists per-page via `usePersistentState('queens:apiary')`,
  matching the other queen filters. It is **local** to the Queens page (not the
  app-wide `SelectionContext` used by Hives).

## Layout
The filter row was a single non-wrapping flex row and was already crowded.
It now uses `sm:flex-wrap` so controls flow onto a second line instead of
overflowing (the search box keeps a `min-w` so it doesn't collapse). This
matches the wrapping behaviour used on the Hives list filter bar.

## Robustness
- **Stale persisted value:** if a saved apiary id is no longer present (apiary
  deleted, or hidden by the current ownership view), `effectiveApiaryFilter`
  falls back to `all` rather than showing an empty list.
- **No extra queries:** options come from in-memory queen data.

## Files changed
- `src/types/queen.ts` — added `id` to the nested `hives.apiaries` type.
- `src/app/dashboard/queens/page.tsx` — apiary `id` in the hive lookup,
  `apiaryFilter` state, `apiaryOptions` + `effectiveApiaryFilter`, the filter
  condition, the wrapping filter row, and the Apiary dropdown.
