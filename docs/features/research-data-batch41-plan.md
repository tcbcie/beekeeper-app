# Batch 41: Research Data

**Status:** Implemented 24/10/2026, waiting for the owner's test.
**Checklist:** `tasks/security-batch41-todo.html`
**Migration:** `supabase/migrations/20261024140000_research_batch41_shared_gdd_nearby.sql`, applied through MCP.
**Findings:**
- **Fixed:** C7b-06, 07, 08, 10 to 16 and 18; C7b-21's paging; C7b-22.
- **Left as it is:** C7b-17.
- **Next batch:** C7b-23 to C7b-25 (screens) go in batch 42.

This is Phase 2 fix batch 28.

## A. GDD charts: C7b-06, C7b-08, C7b-18

- **C7b-18 / C7b-06:** when no years are selected, the accumulation effect in `GDDDataTab` and `PublicGDDTab` now:
  - bumps `accumulationRequestRef`, so a load still running can't land;
  - clears `accumulationData`;
  - stops the spinner.

  Before, the old lines stayed and "Select at least one year" never showed. `ForagingHoursTab` also clears its accumulation, monthly and current-year data.
- **C7b-08:** `selectedYears.slice().sort(...)` replaces the in-place sorts in `GDDDataTab`.

## B. Wild colonies: C7b-10 to C7b-13

- **C7b-10:** `WildColoniesTab.saveColony` uses `Number()`, and requires both values to be finite and within ±90 / ±180. It shows a toast otherwise. `parseFloat` kept "53.27x", and `NaN` reached a NOT NULL column.
- **C7b-11:** `WildColonyInspectionForm` fetches the weather once per open, with a cancel flag and an `ok` check. It fills `weather_temp` only while it is still null. Before, the effect depended on `weather_temp`, so clearing it, or typing "-", refetched and refilled it.
- **C7b-12:**
  - the form uses `value={weather_temp ?? ''}`;
  - the card checks `!= null`, so 0°C shows;
  - `HiveScaleCard` uses `Math.round`, so no more "-0°C".
- **C7b-13:**
  - the photo preview is set in a `useEffect` instead of a `useState` initialiser;
  - the panel keys the form by inspection id.

## C. Research page and scale cards: C7b-14, C7b-15, C7b-16

- **C7b-14:**
  - `visibleSection` falls back to `gdd-data` when `?section=` names a section the user can't see.
  - `initUser` is wrapped in try/finally, and shows an error when it fails.
- **C7b-15, in `HiveScaleCard`:**
  - a module-level `weatherCache` keeps one request per location for 30 minutes, and drops failures;
  - GDD comes through `fetchCurrentYearGDD`, which is checked, timed out and cached;
  - both refresh intervals skip while `document.hidden`.
- **C7b-15, elsewhere:**
  - `ScaleSensorDisplay` on the hive page skips refreshes while hidden too;
  - `ApiaryWeatherRow` shares one forecast request per coordinates (`requestWeather` and `weatherInflight`).
- **C7b-16:**
  - the current-year totals in `GDDDataTab` and `PublicGDDTab` use `calculateGDDFromDaily`;
  - the running totals use `getSeasonalMultiplier`, with the month read from "YYYY-MM-DD" (`new Date()` read it as UTC midnight);
  - `HiveScaleCard` uses the helper;
  - `public/embed/tcbc-research-widget.js` keeps its own copy, as documented.

## D. Public embed: C7b-07

- **The route:** `src/app/api/embed/gdd-archive/route.ts` (GET `?region=&year=`).
  - **What it serves:** only regions in `src/lib/embed-regions.ts`, which the embed page now shares, and years from 2000 to this year by the Irish date.
  - **Where the dates and coordinates come from:** the server works them out.
  - **Upstream fetch:** `next: { revalidate }`, 6 hours for this year and 30 days for past years. A 15-second limit races the request rather than aborting it, so caching still works (QA fix).
  - **Response:** `Cache-Control: public, s-maxage, stale-while-revalidate`; 400 for a bad region or year, and 502 when the upstream fails.
- **`PublicGDDTab`:** takes `region` (the slug) instead of coordinates. Its three archive reads go through `fetchRegionArchive`, which keeps one request per region and year per page.
- **Unchanged:** the dashboard still calls Open-Meteo through `fetchArchiveDaily`.
- **Test:** `tests/api/embed-gdd-archive.test.ts`.

## E. Data reads: C7b-21, C7b-22

- **C7b-21:** `DiagnosisImagesTab` reads images and comments through `fetchAllPages`, ordered by `created_at` then `id`.
- **C7b-22:** `get_shared_gdd_records()` keeps its name and arguments, but is dropped and recreated because the return type changed.
  - **What it returns:** shared records only, without `user_id`, and only from other beekeepers (`gr.user_id <> auth.uid()`).
  - **Distance:** within 20 km of one of the caller's apiaries (`calculate_distance_km` on the blurred point).
  - **Access:** signed-in users only, with `search_path = public`. The advisors are unchanged.
  - **Callers:** both drop `user_id` from their types and filters.
  - **Dashboard cache:** the dashboard's per-user cache now clears on sign-in and sign-out (QA fix).

## F. Left as it is

**C7b-17:** `PublicGDDTab` stays a separate component. It differs from `GDDDataTab` in its data source, filters, sharing and events. Pulling the pure chart builders into a lib file is the right step the next time a feature changes both files.

## Rules

- Public pages never call third-party APIs from every visitor's browser: put a cached, validated server route in between.
- RPCs filter by distance and ownership in SQL and return only the columns callers need.
- Polling intervals skip while `document.hidden`.
- Fill a form field automatically only while it is empty, and never make an effect depend on the field it fills.
