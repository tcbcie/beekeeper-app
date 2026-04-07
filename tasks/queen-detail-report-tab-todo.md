# Queen Detail — Report Tab TODO

Plan: `docs/features/queen-detail-report-tab-plan.md`
Status: Implemented — awaiting user testing.

## Tasks

- [x] **1. Tabs scaffold** — Overview / Report tabs added in `src/app/dashboard/queens/[id]/page.tsx` using existing `NavTabButton`.
- [x] **2. Types** — `QueenReport`, `TraitAverages`, `SisterSummary`, `LatestInspectionSnapshot`, `ReportTimeWindow` added to `src/types/queen.ts`.
- [x] **3. Data layer** — `fetchQueenReport(motherId, queenId, hiveId, window)` added to `src/hooks/useQueenDetail.ts`. Three queries: sisters, this queen's hive ratings, sister hive ratings; plus latest inspection snapshot. Averages computed client-side ignoring NULL values per-trait.
- [x] **4. Pedigree & Mating Site card** — mother, father (or "Open mated"), subspecies, lineage, batch, mated date, mated Eircode, plus an italic note when no father is recorded but a mating site exists.
- [x] **5. Sisters card** — sisters listed with marking colour, status, hive/apiary, mating Eircode and date. Linkable to each sister's detail page.
- [x] **6. Trait Averages card** — Docility, Population, Brood Pattern, Calmness, Swarm Tendency with `value / 5`, sample size, and a 5-segment Tailwind bar.
- [x] **7. Sister Comparison row** — appears next to each trait when sister averages are available, with up/down/equal arrows.
- [x] **8. Latest Inspection Snapshot card** — most recent inspection date, queen seen, eggs present, disease flags from the six disease columns.
- [x] **9. Filters** — All time / 90 days / 30 days time window (default All time) and 1+ / 3+ / 5+ / 10+ min inspection gate.
- [x] **10. Empty / edge states** — handled: no hive, no mother, no inspections, ratings below threshold, no diseases, no batch, no father.
- [ ] **11. Manual test** — pending user testing on mobile and desktop, light and dark modes.
- [x] **12. Docs** — feature plan + this todo updated.

## Review

### What changed
- **`src/types/queen.ts`** — added five new types for the report data.
- **`src/hooks/useQueenDetail.ts`** — added `fetchQueenReport` (stable `useCallback`, no internal state — pure data fetch). Helper functions `sinceForWindow`, `averageRatings`, and constants `EMPTY_AVERAGES`, `DISEASE_COLUMNS` are module-level so they don't recreate per render.
- **`src/app/dashboard/queens/[id]/page.tsx`** — added a tab state, two `NavTabButton`s, and wrapped the existing overview content in a fragment that only renders when the Overview tab is active. Cell banner, age warning, and header are shared across both tabs (intentional — they're queen-level metadata).
- **`src/components/queens/QueenReportTab.tsx`** — new presentational component that owns its own filter state and triggers `fetchQueenReport` via `useEffect` on tab activation and on time-window change. Min-inspections is a pure client-side gate (no refetch).

### Design decisions
- **Lazy fetch** — report data is only fetched when the Report tab is opened, not on initial page load. The first render of the Report tab is the trigger because the component only mounts then (ternary, not class toggle).
- **Three queries, not one** — kept queries simple and readable (sisters, this hive's ratings, sister hives' ratings) over a single complex join. Total round-trips are at most 4 when the tab opens (sisters + ratings + latest + sister averages).
- **Averages client-side** — PostgREST does not aggregate from the JS client. Row counts per queen are typically small (<50). Matches existing patterns elsewhere in the project.
- **Latest inspection ignores time window** — we always show the most recent inspection in that card so the user sees current disease state regardless of filter. This matches how a beekeeper would actually use the report.
- **Mating site fallback messaging** — when there's no father recorded but a mated_at_eircode exists, an italic note explains it's the surrogate for drone provenance.

### Manual test plan for the user
1. Open a queen with **a mother and several sisters** → Sisters card lists them; trait averages show; Sister Comparison arrows appear.
2. Open a queen with **no mother** (e.g. an imported queen) → Sisters card shows "set a mother to compare with siblings".
3. Open a queen with **no hive assignment** → Trait Averages and Latest Inspection cards show empty-state messages; Sisters card still works.
4. Open a queen whose hive **has zero inspections** → "Only 0 inspections in the selected window" message.
5. Open a **cell-status** queen → Cell banner remains; Report tab loads but most cards show empty states.
6. Toggle **time window** between All time / 90 / 30 → averages refetch.
7. Toggle **min inspections** → averages card hides when below threshold without refetching.
8. Test in **light + dark mode** and on **mobile + desktop** widths.
