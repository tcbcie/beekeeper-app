# Feature: Queen Comparison View
**Date:** 07/04/2026
**Status:** Implemented (awaiting manual test)

## 1. Overview
The single-queen Report tab (added in `queen-detail-report-tab-plan.md`) requires users to open each queen individually. Beekeepers selecting a breeder or culling candidates need to **compare two or more queens side-by-side** on the same screen — pedigree, mating site, trait averages, latest inspection — so they can make a breeding decision without tab-hopping.

## 2. Scope & Simplicity
* **In Scope:**
  * **Multi-select on the queens list** — add a checkbox column to the existing table (`src/app/dashboard/queens/page.tsx`). Selection is local state, cleared on unmount.
  * **"Compare" button** in the page header next to **Lineage** / **Export CSV** / **Add Queen**. Disabled until 2 queens are selected, shows `Compare (n)`. Soft cap of **4 queens** (enforced on click; warn if more selected).
  * **New page** `/dashboard/queens/compare` that accepts `?ids=a,b,c,d` and renders a side-by-side comparison using the existing `fetchQueenReport` helper (one call per queen, in parallel).
  * **Compare page layout** — columnar table: queens as columns, attributes as rows, grouped into sections:
    1. **Identity** — queen number (linkable), status, age, marking colour, subspecies
    2. **Pedigree** — mother, father (or "Open mated"), lineage, batch
    3. **Mating Site** — mated date, mated Eircode
    4. **Assignment** — hive, apiary
    5. **Trait Averages** — Docility, Population, Brood Pattern, Calmness, Swarm Tendency, each with `n=` sample size and the existing 5-segment bar component
    6. **Latest Inspection** — date, queen seen, eggs present, disease flags
  * **Best-in-row highlight** — for each trait row, the highest value is **bolded** with a subtle forest-green background (not colour alone — the value is also bolded). No highlight if data is insufficient or tied.
  * **Shared filter** — single "Time Window" control (All / 90 days / 30 days) applied to every queen. Defaults to **All time** (matches the Report tab).
  * **Empty states** — handled for: queen not found, queen has no hive, queen has no inspections in window.
* **Out of Scope:**
  * No new database schema or migrations.
  * No charts or radar plots (just bars).
  * No persistent comparison sets or "saved comparisons".
  * No cross-user comparisons — RLS already scopes by user.
  * No PDF export. (Can be added later.)
  * No new selection UI on the lineage page or the detail page — selection lives only on the list.
  * No changes to the Report tab added in the previous feature.

* **Existing Code Impact (minimal):**
  * `src/app/dashboard/queens/page.tsx` — add selection state, a checkbox column, and a Compare button. Roughly ~40 lines.
  * **New** `src/app/dashboard/queens/compare/page.tsx` — the compare view. Client component. Fetches each queen + report via existing helpers.
  * **New** `src/components/queens/QueenCompareTable.tsx` — pure presentational table. Reuses the `TraitBar` concept and colour-badge helpers from `QueenReportTab` (extracted to a shared helper to avoid duplication).
  * **New** `src/components/queens/queenTraitVisuals.tsx` — small shared module for `TraitBar` and `colorBadgeClass` so both `QueenReportTab` and `QueenCompareTable` use the same visuals.
  * No hook or type changes — `useQueenDetail` / `fetchQueenReport` already return exactly the data we need for each queen.

## 3. Technical Design
### Architecture
- Selection is in `QueensPage` component state as `Set<string>`. Clicking the **Compare** button does `router.push('/dashboard/queens/compare?ids=' + [...selected].join(','))`.
- The compare page parses `ids` from the URL, fetches each queen's detail and report in parallel using `Promise.all`. Errors for individual queens degrade to an empty column with a warning (don't fail the whole page).
- Fetches are keyed on `ids` + `timeWindow`. Changing the time window refetches all queens in parallel.
- Filters out IDs not owned by the user via the existing queens RLS policy (invalid IDs just return null).

### Database Connections (MCP Server)
No schema changes. Reads use the existing Supabase client. Per-queen data comes from two existing queries plus the already-verified `fetchQueenReport`:
- `queens` row with `mother`, `father`, `batch`, `hives(id, hive_number, apiaries(name))` join
- Existing `fetchQueenReport(motherId, queenId, hiveId, range)` for the averages and latest snapshot

Total network cost for a 4-queen comparison: 4 queen queries + up to 16 report queries (4 × 4), all fired in parallel. For comparison, the Report tab does 4 queries for one queen. Acceptable.

### Reusability
To avoid duplicating the `TraitBar` and `colorBadgeClass` helpers that already live inside `QueenReportTab.tsx`, we'll extract them into `src/components/queens/queenTraitVisuals.tsx` and import from both places. This is the only pre-implementation refactor; it touches only the two files.

## 4. Edge Cases & Risks
* **Fewer than 2 IDs in URL** → redirect back to `/dashboard/queens` with a toast.
* **More than 4 IDs in URL** → keep the first 4 and show a warning banner.
* **Invalid / unowned queen ID** → column shows "Queen not found or not accessible" stub.
* **Queen with no hive** → trait and latest-inspection cells show "—" with a subtitle "no hive assigned".
* **Queen with no inspections in window** → trait cells show "—" with `n=0`.
* **All queens have n=0 for a trait** → no best-in-row highlight for that row.
* **Ties on best-in-row** → no highlight (explicit "don't mislead on ties").
* **Mobile** — 2-queen comparison fits narrow screens comfortably; 3-4 queens gets horizontal scroll via the existing `overflow-x-auto` pattern. Column min-width and sticky first column (attribute labels) for readability.
* **Race-safety** — the compare page uses the same `cancelled` flag pattern as the Report tab to suppress stale results when the user changes the time window.

## 5. Implementation Phases
1. **Phase 1 — Extract shared visuals** — move `TraitBar` and `colorBadgeClass` from `QueenReportTab.tsx` into `src/components/queens/queenTraitVisuals.tsx`. Update `QueenReportTab` to import from it. No behavioural change.
2. **Phase 2 — Selection on the queens list** — add `selectedIds: Set<string>` state, a checkbox column at the start of the table, a Compare button in the header (`Compare (n)`, disabled until ≥ 2), and a handler that navigates to `/dashboard/queens/compare?ids=...`.
3. **Phase 3 — Compare page scaffold** — create `src/app/dashboard/queens/compare/page.tsx` with URL param parsing, the Time Window filter, and a loading state.
4. **Phase 4 — Per-queen data fetch** — reuse `useQueenDetail`? No — create a lightweight standalone helper in the page (or a new `useQueenComparison` hook) that fetches queen rows + report data in parallel. Prefer the page itself — a single `useEffect` with `Promise.allSettled` is simpler than a bespoke hook.
5. **Phase 5 — `QueenCompareTable` component** — render the six sections as described, with best-in-row highlighting for trait rows.
6. **Phase 6 — Empty / error states** — invalid IDs, missing hive, missing inspections, tie-breaking on highlight.
7. **Phase 7 — Mobile polish** — horizontal scroll, sticky attribute column, minimum column widths.
8. **Phase 8 — Docs** — review section in this file and the todo.

## 6. UI Notes (light-first, 50+ readability)
- Checkboxes are 20×20 px (≥ 44 px tap target through padding), forest-green when checked.
- Compare button matches the existing "Lineage" / "Export CSV" button styling.
- Compare page header shows a back link, the queen count, and the time-window filter.
- Best-in-row highlight: value is **bolded** with a forest-100 (light) / forest-900/30 (dark) background pill. No reliance on colour alone.
- All labels in British English.

## 7. Review

### What shipped vs the plan
The implementation matched the plan with two refinements:

1. **`fetchQueenReport` was lifted out of the hook entirely.** The plan suggested either reusing `useQueenDetail` from the compare page or writing a one-off helper. Instead, the report-fetching logic was promoted to a module-level standalone function (`fetchQueenReportData` in `src/hooks/useQueenDetail.ts`). The hook still re-exposes it on its return for the queen detail page, but the compare page now imports the function directly. This avoids paying for an unused hook instance and keeps the call sites symmetric.
2. **`requestIdRef` instead of a `cancelled` flag.** The plan referenced the Report tab's `cancelled` flag pattern, but on the compare page the flag wouldn't actually guard state writes that happen inside an async helper kicked off by the effect. A monotonic `useRef` bumped on every effect run is the simpler correct shape — every async checkpoint short-circuits cleanly.

### Files touched
- **New** `src/components/queens/queenTraitVisuals.tsx` — `colorBadgeClass`, `TraitBar`, `formatRating`.
- **New** `src/components/queens/QueenCompareTable.tsx` — columnar comparison table.
- **New** `src/app/dashboard/queens/compare/page.tsx` — comparison page.
- **Modified** `src/components/queens/QueenReportTab.tsx` — now imports shared visuals.
- **Modified** `src/hooks/useQueenDetail.ts` — extracted `fetchQueenReportData` (exported) and pointed the hook return at it.
- **Modified** `src/app/dashboard/queens/page.tsx` — selection state, sessionStorage persistence, checkbox column, Compare button, 4-queen cap.

### Things we deliberately did NOT do
- No persistent saved comparisons.
- No PDF / CSV export from the compare view (already on the queens list).
- No bulk-select header checkbox (kept v1 small).
- No charts — bars only.
- No selection UI on the lineage page or detail pages.
