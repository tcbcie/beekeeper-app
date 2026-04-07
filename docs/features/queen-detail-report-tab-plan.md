# Feature: Queen Detail — Report Tab & Enhanced Relations
**Date:** 07/04/2026
**Status:** Draft

## 1. Overview
The queen detail page (`/dashboard/queens/[id]`) currently shows a single overview with identity, genetics, hive assignment, lineage tree, offspring and sighting history. Beekeepers need a richer **preliminary assessment** tool: a second tab that surfaces the queen's wider family (sisters, cousins), her mating site (which substitutes for the missing paternal line in open-mated queens), and **average trait scores** drawn from her hive's inspections (docility/temperament, population strength, brood pattern, calmness, swarm tendency, hygienic behaviour). This lets a beekeeper assess any queen at any moment using only the data already captured.

## 2. Scope & Simplicity
* **In Scope:**
  * Add a two-tab control to the queen detail page: **Overview** (existing content, unchanged) and **Report** (new).
  * **Report tab content:**
    1. **Pedigree & Mating Site card** — mother, father (if known), subspecies, lineage, batch, **mated date** and **mated Eircode** (the surrogate for the absent paternal line).
    2. **Sisters card** — all queens that share the same `mother_id` (and optionally the same `batch_id`); each shown with status, marking colour, hive, apiary, mated location.
    3. **Trait Averages card** — averages of these inspection fields across the queen's currently-assigned hive: `temperament_rating` (Docility), `population_strength`, `brood_pattern_rating`, `calmness`, `swarming_tendency`. Each shown with sample size (`n=`) and a 1–5 visual indicator.
    4. **Sister Comparison row** — for the same five traits, show this queen's average alongside the sisters' combined average so the user can see "above/below sisters".
    5. **Latest Inspection Snapshot** — single-row summary of the most recent inspection date, queen seen, eggs present, disease flags (any disease rating > 0).
    6. **Filters** (top of report tab):
       - Time window: `Last 30 days` / `Last 90 days` / `All time` (default: All time)
       - Minimum inspection count to surface averages (default: 1)
  * Reuse `useQueenDetail` hook by extending it with a new helper function (`fetchQueenReport`) that pulls sisters + inspection aggregates. No changes to the overview tab data.
* **Out of Scope:**
  * No new database tables or columns. Reads only from `queens`, `hives`, `apiaries`, `inspections`.
  * No charting libraries — bars and badges in plain Tailwind.
  * No PDF export, printing, or cross-queen ranking tables. (Can be added later.)
  * No edits to the lineage tree component or the existing offspring/sightings sections.
  * No changes to the queens list page.

* **Existing Code Impact (minimal):**
  * `src/app/dashboard/queens/[id]/page.tsx` — wrap existing content in an Overview tab; add a Report tab.
  * `src/hooks/useQueenDetail.ts` — add a `fetchQueenReport(queenId, options)` returning `{ sisters, traitAverages, sisterAverages, latestSnapshot }`. Lazy-loaded only when the Report tab is opened.
  * `src/types/queen.ts` — add `QueenReport`, `TraitAverages` types.
  * **New** `src/components/queens/QueenReportTab.tsx` — pure presentational component receiving the report data.

## 3. Technical Design
### Architecture
- Tabs are rendered with simple local state (`useState<'overview' | 'report'>`). No router changes — keep the URL stable.
- Report data is fetched on first tab activation and cached in component state; switching back to Overview does not refetch.
- All queries are scoped via existing RLS — no service-role calls.

### Database Connections (MCP Server)
All reads use the existing Supabase browser client. The relevant tables/columns (verified directly via the MCP server):

**`queens`** — `id, queen_number, mother_id, father_id, marking_color, status, mated_date, mated_at_eircode, batch_id, subspecies, lineage`

**`inspections`** — trait fields:
- `temperament_rating` (Docility)
- `population_strength`
- `brood_pattern_rating`
- `calmness`
- `swarming_tendency`
- `propolis_level`, `vsh`, `smr`, `recapping` (used for the latest snapshot only, not the headline averages — keeps the UI focused on the five traits the user named)
- `queen_seen`, `eggs_present`, disease columns for the latest snapshot

**Sisters query** (one query):
```sql
select id, queen_number, marking_color, status, mated_date, mated_at_eircode,
       hives!queen_id(hive_number, apiaries(name))
from queens
where mother_id = :mother_id and id <> :queen_id
order by birth_date desc
```

**Trait averages for the queen's hive** (one query, filtered by time window):
```sql
select
  avg(temperament_rating)   as docility,
  avg(population_strength)  as population,
  avg(brood_pattern_rating) as brood_pattern,
  avg(calmness)             as calmness,
  avg(swarming_tendency)    as swarm_tendency,
  count(*) as n
from inspections
where hive_id = :hive_id
  and inspection_date >= :since
  and (temperament_rating is not null
       or population_strength is not null
       or brood_pattern_rating is not null
       or calmness is not null
       or swarming_tendency is not null)
```

**Sister averages** — same shape but with `hive_id in (select id from hives where queen_id in :sister_ids)`. One round-trip.

**Latest inspection snapshot** — single row, ordered by `inspection_date desc limit 1` on the queen's hive.

PostgREST does not aggregate via the JS client, so these averages are computed client-side from a `select(...)` of the rating columns over the relevant inspections (small row counts — typically <50 per queen). This avoids needing a stored function and follows the existing pattern in the codebase.

## 4. Edge Cases & Risks
* **Queen has no assigned hive** → trait averages and snapshot are unavailable. Show an empty-state message in those cards. Sisters card can still render.
* **Queen has no mother recorded** → sisters list is empty. Show "No sisters recorded — set a mother to compare with siblings."
* **Inspections have NULL ratings** → ignore nulls per-trait when averaging; show `n=0` and "No data yet" if all inspections in the window lack a given rating.
* **Time window yields zero inspections** → show "No inspections in selected window" rather than `NaN`.
* **Sister has no hive currently** → still listed under Sisters, just without averages contributed.
* **Cell-status queens** (`status = 'cell'`) → report tab still loads but most cards show empty states; we already show the cell banner above the tabs.
* **Performance** — the queen detail page already loads several queries; the report adds at most three additional queries and only when the user opens the tab.
* **PostgREST array-vs-object joins** — must follow the project's documented rule (use `[0]` access on explicit-select joins). Memory note already in `MEMORY.md`.

## 5. Implementation Phases
1. **Phase 1 — Tabs scaffold**
   Wrap existing detail content in an Overview tab. Add empty Report tab with header. Verify nothing in the overview regresses.
2. **Phase 2 — Data layer**
   Extend `useQueenDetail` with `fetchQueenReport(queenId, { since })`. Lazy-trigger on Report tab activation. Handles all edge cases and returns typed data.
3. **Phase 3 — Pedigree & Mating Site card**
   Mother, father, subspecies, lineage, batch, mated date, mated Eircode.
4. **Phase 4 — Sisters card**
   Renders sisters from the new query, each linkable to its detail page. Shows hive/apiary/mating site if available.
5. **Phase 5 — Trait Averages card**
   Five traits, sample size, simple 1–5 bar (Tailwind, no library).
6. **Phase 6 — Sister Comparison row**
   Side-by-side this queen vs sisters' combined averages. Up/down indicator.
7. **Phase 7 — Latest Inspection Snapshot card**
   Most recent inspection summary plus disease flags.
8. **Phase 8 — Filters**
   Time window selector and minimum-inspection threshold. Refetch on change.
9. **Phase 9 — Documentation**
   Update this feature doc with a Review section once implemented.

## 6. UI Notes (light-first, 50+ readability)
- Tabs use the existing `Button` component styling — minimum 44px tap target, clear active state.
- Trait values rendered as both number (`3.4 / 5`) and a 5-segment bar; never relying on colour alone.
- Body copy stays at the project default size (no dense small text).
- All labels in British English ("Docility", "Mated at", "Sisters", "Average over last 90 days").
