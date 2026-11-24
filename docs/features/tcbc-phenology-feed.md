# Feature: Public phenology feed for tcbc.ie

**Date:** 24/11/2026
**Status:** Implemented

## 1. Overview

The TCBC homepage (tcbc.ie) shows two Galway tables comparing last year with this year:

- the **Irish Phenological Table**: when each plant or colony event started, and the GDD at the start;
- the **GDD Sum**: accumulated growing degree days on fixed dates, and the date the previous year reached the same total.

HiveCraic owns both the data (shared `gdd_records`) and the GDD formula (`src/lib/gdd.ts`), so it serves one
public, read-only, cached JSON feed for those tables. tcbc.ie fetches it **server-to-server**, caches it for
6 hours and falls back to its last good copy. The brief, from the TCBC project, is
`/opt/projects/tcbcie/docs/hivecraic-phenology-api-brief.md`. The contract is also validated on the TCBC side in
`src/lib/phenology/types.ts`.

```
GET /api/embed/phenology?region=galway&years=2025,2026[&dates=02-01,03-01,04-01,05-01]
```

Live URL: `https://www.hivecraic.com/api/embed/phenology`. The TCBC owner sets
`HIVECRAIC_PHENOLOGY_URL` to it in Vercel and redeploys.

## 2. Scope & Simplicity

**In scope**
- Community mode only (owner's decision, 24/11/2026). The feed uses every shared record in the region's public
  view. There is no publisher allow-list.
- Colony events (names starting with "Brood" or "Pollen") stay in the feed as `category: "colony"`. None exist
  as vegetation types yet.
- The default GDD sum dates are `02-01,03-01,04-01,05-01`.

**Out of scope**
- Browser CORS, because the feed is server-to-server.
- Authentication and rate limiting. The CDN cache and the cached archive fetch carry the load.

**Existing code touched**
- The archive fetch in `src/app/api/embed/gdd-archive/route.ts` moved, unchanged, into
  `src/lib/embed-archive.ts` (`fetchEmbedArchive`). Both routes now share one cached Open-Meteo call per region and year.
- The shared fetch also checks that `temperature_2m_min` is present before using the archive, because `calculateGDDFromDaily`
  reads it.

## 3. Technical Design

| File | Role |
|---|---|
| `src/app/api/embed/phenology/route.ts` | GET handler: validation, anon Supabase read, archive fetches, JSON and cache headers |
| `src/lib/phenology-feed.ts` | Pure builders: `parseYears`, `parseDates`, `eventKey`, `buildEvents`, `buildGddSums`, `gddOnDate`, `dateReached` |
| `src/lib/embed-archive.ts` | `fetchEmbedArchive(region, year)`: Open-Meteo archive through Next's fetch cache (6 h current year, 30 days past years, 15 s time limit) |
| `src/lib/embed-regions.ts` | Region allow-list (`galway`: `public_galway_gdd`, 53.2707, −9.0568) and `EMBED_FIRST_YEAR` |
| `supabase/migrations/20261124100000_capture_public_galway_gdd_view.sql` | Records `shared_gdd_records_community` and `public_galway_gdd`. Both were created by hand earlier, so this file is documentation only and the live database is unchanged. |
| `tests/api/embed-phenology.test.ts` | Route tests |

### Parameters

| Parameter | Rules (otherwise `400 {"error": "..."}`) |
|---|---|
| `region` | Required. An own key of `EMBED_REGIONS`. |
| `years` | Required. 1–3 four-digit years, from `EMBED_FIRST_YEAR` to the current Irish year. Duplicates are removed and the years are echoed in ascending order. |
| `dates` | Optional. Up to 12 real `MM-DD` days (`02-29` allowed). Duplicates are removed and the days are sorted into calendar order. |

`502 {"error": "..."}` is returned when the view or any needed archive year can't be read. The feed never returns a partial answer.

### Data path and privacy

- **Observations:** the route reads the **anon-readable** `public_galway_gdd` view with the anon key and selects
  only `vegetation_name, year, start_date, end_date, gdd_value`.
  - The view already leaves out user ids and coordinates.
  - `gdd_records`, `shared_gdd_records_community` and `get_shared_gdd_records()` remain closed to `anon`.
- **Payload:** the feed carries no ids, user ids, apiary ids, cities, coordinates or notes. The only coordinates
  in it are the region centroid used for temperatures, in `source.temperatures`.

### Response (version 1)

```json
{
  "version": 1,
  "region": { "slug": "galway", "label": "Galway" },
  "generated_at": "2026-11-24T10:00:00Z",
  "years": [2025, 2026],
  "events": [
    { "key": "snowdrops", "name": "Snowdrops", "category": "plant",
      "observations": { "2025": { "start": "2025-01-30", "end": "2026-03-20", "gdd": 77 }, "2026": { "...": "..." } } }
  ],
  "gdd_sums": [
    { "date": "02-01", "values": { "2025": 91.7, "2026": 81.8 }, "reached_previous_year": { "2025": "2024-02-02", "2026": "2025-01-31" } }
  ],
  "source": { "observations": "...", "temperatures": "...", "formula": "..." }
}
```

### Rules

**Events**
- `key` is a slug of the **full** name, e.g. `cherry-plum-prunus-cerasifera`, `clover-red`, `gorse-ulex`.
  Dropping the Latin in brackets would merge different plants such as "Clover (Red)" and "Clover (White)".
- **Community merge:** within one event and year, the earliest `start_date` wins with that record's `gdd_value`.
  On a tie the lower GDD wins, so the result is deterministic. The latest `end_date` across the records is kept.
- If a record has no `gdd_value`, its `gdd` is the GDD accumulated to its start date from the region's
  temperatures, when the start falls in the record's year. Otherwise it is `null`.
- Events are ordered by days from 1 January to the start, using the latest year the event was seen. A December
  start, such as gorse, sorts first. The list is capped at 100 events.

**GDD sums**
- `values[year]` is `calculateGDDFromDaily` over 1 January up to and including the date, at the region centroid.
  It is `null` when the date is after today (Irish date), isn't a real date in that year, or isn't in the archive yet.
- `reached_previous_year[year]` is the first day of `year − 1` whose running total is at least `values[year]`.
  It is `null` when that total was never reached, when `year − 1` is before `EMBED_FIRST_YEAR`, or when the value is null.
- The route fetches the archive for every requested year and the year before it, at most 4 cached calls.

### Caching

- When the current year is requested, the response sends `Cache-Control: public, s-maxage=21600, stale-while-revalidate=86400`.
- When only past years are requested, it sends `public, s-maxage=2592000`.
- Open-Meteo responses sit in Next's data cache. That is 6 h for the current year and 30 days for past years, shared with `/api/embed/gdd-archive`.

## 4. Edge Cases & Risks

- **The figures differ from tcbc.ie's historic table.**
  - The table showed, for example, 85.5 GDD on 1 February 2025 and snowdrops at 78.9.
  - The feed uses HiveCraic's formula at the Galway centroid, giving 91.7 on 1 February 2025. The stored record GDDs were
    worked out at each observer's own apiary, so snowdrops show 77.0.
  - At an apiary around 53.40, −9.10 the same formula gives 77.1 for 30 January 2025, which matches the stored values.
  - The difference is location and data source, not the formula.
- **Some shared records have an end date in the following year,** e.g. Hazel 2025 ending 2026-04-06. They are published as
  recorded.
- **A start before 1 January** belongs to the record's `year` (as in `gdd_records.year`), so gorse from December appears under
  the next season.
- **Adding a region** needs a `public_<region>_gdd` view and an `EMBED_REGIONS` entry, as for the research embed.

## 5. Implementation Phases

1. Migration file recording the two hand-made views.
2. Shared `fetchEmbedArchive` helper. The gdd-archive route uses it, with no behaviour change.
3. `src/lib/phenology-feed.ts` builders.
4. `/api/embed/phenology` route.
5. Tests and docs (this file, plus a pointer in `tcbc-wordpress-research-widget.md`).
