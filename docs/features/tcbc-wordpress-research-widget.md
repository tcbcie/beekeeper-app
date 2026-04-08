# TCBC WordPress Research Widget

## Summary

Embed HiveCraic's research / GDD functionality into the existing TCBC WordPress site at [www.tcbc.ie](https://www.tcbc.ie) so visitors can see current Galway-region Growing Degree Day data, what's blooming now, and the week's foraging outlook — without requiring a HiveCraic account.

Implemented as a drop-in JavaScript widget backed by a new public Supabase view scoped to the Galway bounding box. No WordPress plugin required — a short `functions.php` shortcode and a `<script>` tag on the relevant page.

## Goals

1. Surface useful public information from the HiveCraic community dataset to TCBC members browsing the club website.
2. Reuse the existing `shared_gdd_records_community` view (already anonymised — city-level location only).
3. No duplication of GDD calculation logic — the widget pulls daily temperatures directly from Open-Meteo and runs the same seasonal-multiplier formula as `src/lib/gdd.ts`.
4. Native look-and-feel inside the WordPress theme — widget inherits the site's fonts and accent colour via CSS variables.
5. Zero authentication — uses the Supabase anon key with a region-locked read-only view.

**Current data footprint:** 60 shared records across Mace (35), Galway city (21), Tonamace (3), and Luggawannia (1) — all in County Galway, lat 53.31–53.45, lon -9.14 to -9.03.

## Non-goals

- Editing HiveCraic data from WordPress (read-only).
- Per-user or per-apiary views (WordPress side is anonymous aggregate only).
- Scale Overview, Diagnosis Images, or Wild Colonies tabs (irrelevant without auth / hardware).
- WordPress plugin with admin UI — the shortcode is enough.
- SEO-indexed rendered data (content is dynamic and hydrates client-side).

## Architecture

```
┌─────────────────────┐          ┌─────────────────────┐
│  www.tcbc.ie        │          │  HiveCraic (Vercel) │
│  (WordPress)        │          │                     │
│                     │          │                     │
│  [tcbc_gdd_widget]  │ ───────► │  Supabase view:     │
│  shortcode          │  HTTPS   │  public_galway_gdd  │
│                     │          │  (anon-readable)    │
│  tcbc-research-     │          │                     │
│  widget.js (CDN)    │          │                     │
└─────────┬───────────┘          └─────────────────────┘
          │
          │  HTTPS
          ▼
┌─────────────────────┐
│  api.open-meteo.com │
│  (current-year daily temps for
│   Galway centroid)  │
└─────────────────────┘
```

## Data sources

### 1. Existing — `shared_gdd_records_community` view

Already in production. Columns:
`id, vegetation_type_id, year, start_date, end_date, gdd_value, user_id, vegetation_name, city, latitude, longitude`

Currently exposed via RLS to authenticated users only. We add a **new**, narrower, public-readable view on top of it.

### 2. New — `public_galway_gdd` view

Read-only, bounded to County Galway. No `user_id` exposure. Granted to `anon` role.

```sql
-- Bounding box covers County Galway comfortably:
-- lat 53.00 → 53.80, lon -10.20 → -8.30
CREATE OR REPLACE VIEW public_galway_gdd AS
SELECT
  id,
  vegetation_type_id,
  vegetation_name,
  year,
  start_date,
  end_date,
  gdd_value,
  city
  -- Deliberately omits: user_id, latitude, longitude
FROM shared_gdd_records_community
WHERE latitude BETWEEN 53.00 AND 53.80
  AND longitude BETWEEN -10.20 AND -8.30;

-- Grant anonymous read access
GRANT SELECT ON public_galway_gdd TO anon;
```

Security notes:
- No exact coordinates leave the database — only the city name.
- `user_id` is stripped at the view level (can't be filtered by).
- Supabase project CORS is already locked per-origin; add `https://www.tcbc.ie` and `https://tcbc.ie` to the allow-list.
- Consider a Postgres row-count cap via Supabase project settings (`db.max_rows` default 1000 is fine — current dataset is 60 rows).

### 3. Open-Meteo Archive API (external, already in use)

`https://archive-api.open-meteo.com/v1/archive` — called directly from the browser, no key, CORS-open. Galway city centroid: `53.2707, -9.0568`.

## What the widget shows

Three small cards stacked vertically (mobile) or in a row (desktop):

1. **Current GDD** — big number for year-to-date, computed from Open-Meteo using the same seasonal multiplier as `src/lib/gdd.ts::calculateGDDFromDaily`. Sub-line: "as of <today's date>".
2. **Blooming now in Galway** — list of vegetation names from `public_galway_gdd` where today's date falls inside any community bloom record's `start_date`/`end_date` for the current year, OR where the bloom GDD range straddles current GDD. Reuses the logic from `getBloomingPlants` in `src/lib/gdd.ts`.
3. **This week's forage outlook** — pulls the 7-day forecast from Open-Meteo `/v1/forecast`, runs `calculateForagingHours` for each day, and shows a sparkline or simple bar chart.

All three render on load. Total round-trips: 1 Supabase query + 2 Open-Meteo calls (archive + forecast).

## Widget implementation

### Build target

Ship as a single self-contained file: `public/embed/tcbc-research-widget.js` hosted from the HiveCraic Vercel deployment (HTTPS, cacheable).

- Plain JS — no React, no build step on the consumer side.
- Chart.js loaded from a pinned CDN URL inside the widget (or optionally bundled if size allows).
- Target size: < 30 KB gzipped excluding Chart.js.

### Source location

`public/embed/tcbc-research-widget.js` — source of truth checked into this repo, so the GDD formula stays in sync. Duplicate the handful of functions it needs (`calculateGDDFromDaily`, `getSeasonalMultiplier`, `calculateForagingHours`, `parseGDDRange`, `parseBloomMonths`) into a small JS module — we can't directly import from `src/lib/gdd.ts` because that's TypeScript inside the Next.js bundle.

To keep the two in sync, add a comment header referencing `src/lib/gdd.ts` and a note in that file pointing back. Long-term, if this proves useful, extract `gdd.ts` into a shared package — not needed now.

### Public API

```html
<!-- On the TCBC WordPress page -->
<div id="tcbc-gdd-widget"></div>
<script src="https://www.hivecraic.com/embed/tcbc-research-widget.js"
        data-target="#tcbc-gdd-widget"
        data-region="cork"
        data-theme="auto"
        defer></script>
```

Configuration via `data-*` attributes:
- `data-target` — CSS selector for the container div (default `#tcbc-gdd-widget`)
- `data-region` — currently only `galway` (future: `connacht`, `ireland`)
- `data-theme` — `light`, `dark`, or `auto` (reads `prefers-color-scheme`)

### Supabase client usage

The widget reads the anon URL + key from constants baked in at widget build time:

```js
const SUPABASE_URL = 'https://<project>.supabase.co'
const SUPABASE_ANON_KEY = '<publishable-key>'

async function fetchCorkGDD() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/public_cork_gdd?select=*`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  )
  return res.ok ? res.json() : []
}
```

The anon key is already public-by-design; the security boundary is the view + CORS allow-list, not key secrecy.

### Styling

CSS variables prefixed `--tcbc-gdd-*` with sensible defaults. WordPress theme can override them in `style.css`:

```css
:root {
  --tcbc-gdd-accent: #f59e0b;   /* amber */
  --tcbc-gdd-bg: #ffffff;
  --tcbc-gdd-text: #1f2937;
  --tcbc-gdd-border: #e5e7eb;
}
```

Layout via plain flexbox; no Tailwind in the widget.

### Attribution

A small "Powered by HiveCraic" link renders at the bottom-right of the widget — grey text, ~11px, linking to `https://www.hivecraic.com` in a new tab. Always visible, not configurable via `data-*` attributes.

## WordPress integration

No plugin needed. Add to the active theme's `functions.php` (or via the Code Snippets plugin):

```php
// Shortcode: [tcbc_gdd_widget]
add_shortcode( 'tcbc_gdd_widget', function( $atts ) {
  $atts = shortcode_atts( [
    'region' => 'galway',
    'theme'  => 'auto',
  ], $atts, 'tcbc_gdd_widget' );

  $region = esc_attr( $atts['region'] );
  $theme  = esc_attr( $atts['theme'] );

  return sprintf(
    '<div id="tcbc-gdd-widget"></div>' .
    '<script src="https://www.hivecraic.com/embed/tcbc-research-widget.js" ' .
    'data-target="#tcbc-gdd-widget" data-region="%s" data-theme="%s" defer></script>',
    $region,
    $theme
  );
} );
```

Usage inside any WordPress page/post:

```
[tcbc_gdd_widget]
```

Or with overrides:

```
[tcbc_gdd_widget region="galway" theme="light"]
```

## Files

### Created
- `public/embed/tcbc-research-widget.js` — the widget itself
- `public/embed/tcbc-research-widget.css` — optional standalone CSS (or inlined into the JS)
- `sql/migrations/YYYYMMDD_public_galway_gdd_view.sql` — new view + grant (applied via MCP, not raw SQL file — see CLAUDE.md)
- `docs/features/tcbc-wordpress-research-widget.md` — this document

### Modified
- `src/lib/gdd.ts` — add comment header pointing at the embed widget copy so future edits stay in sync

### External (not in this repo)
- TCBC `functions.php` snippet (provided to whoever manages the WP site)

## Tasks

- [x] Apply `public_galway_gdd` view migration via Supabase MCP
- [x] Verify view returns data — 60 records, 4 cities, 30 vegetation types, years 2025–2026
- [ ] Add `https://www.tcbc.ie` and `https://tcbc.ie` to Supabase CORS allow-list in project settings (**manual — Supabase dashboard**)
- [x] Write `public/embed/tcbc-research-widget.js` — three cards, Chart.js for the forage sparkline
- [x] Copy relevant pure functions from `src/lib/gdd.ts` into the widget with a sync comment
- [x] Create preview HTML (`public/embed/tcbc-research-widget-preview.html`) for local testing
- [ ] User: smoke-test the preview file via `npm run dev` (visit `/embed/tcbc-research-widget-preview.html`)
- [ ] Deploy to Vercel — verify `https://www.hivecraic.com/embed/tcbc-research-widget.js` is cacheable and fast
- [ ] Hand over the `functions.php` snippet + usage instructions to the TCBC WP admin
- [ ] Smoke-test the embedded widget on a staging WP page before adding it to a live page
- [ ] Update the review section below once shipped

## Open questions

- **Dark mode detection** — if tcbc.ie has no dark theme, `auto` with `prefers-color-scheme` is still a safe default (degrades to light).
- **Rate limiting** — 60 rows and a handful of visits a day is nowhere near the Supabase anon limits, but if traffic spikes we can add Cloudflare in front.
- **Region scope at launch** — Galway bounding box only, or open up all of Connacht? The view's `WHERE` clause is a one-line change later.

## Future enhancements

1. **Historical accumulation chart** — port the multi-year line chart from `GDDDataTab` into the widget as an optional card. Useful for phenology tracking.
2. **Subscribe to updates** — a "notify me when blackberry blooms in Galway" email hook via Supabase Functions.
3. **Multi-region** — Connacht / Ireland-wide views once more data is available outside Galway.
4. **Inline vegetation photos** — reuse the existing vegetation images from HiveCraic.
5. **Club-only view** — if TCBC wants a member-only section with richer data, add Supabase Auth with a club-scoped role.

## Review

### Implementation notes (in progress)

**Database** — `public_galway_gdd` view created via Supabase MCP migration `create_public_galway_gdd_view`. Scopes to lat 53.00–53.80, lon -10.20 to -8.30. `GRANT SELECT ... TO anon` applied. Sanity check returned 60 records / 4 cities / 30 vegetation types as expected.

**Widget** — `public/embed/tcbc-research-widget.js` is a single 13 KB vanilla JS file with:
- Three cards: Current GDD, Blooming now, This week's forage hours
- Chart.js 4.4.1 lazy-loaded from jsDelivr CDN (only when the forage chart renders)
- Inline CSS with `--tcbc-gdd-*` variables, responsive 1-col (mobile) / 3-col (≥720px) grid
- Light/dark/auto theme via `data-theme` attribute
- "Powered by HiveCraic" attribution link in the footer
- Graceful degradation: each of the three data fetches is independent (`Promise.all` with per-promise `.catch`), so one failing source doesn't blank the others
- De-duplicates blooms by plant name and limits "still blooming" for open-ended records to the last 60 days

**Bloom filter logic** — A community record is "blooming now" if:
1. It's the current year
2. `start_date <= today`
3. Either `end_date >= today` (explicit end) OR `end_date IS NULL` and `start_date` is within the last 60 days

This matches the intuition that beekeepers log a bloom start but rarely log the end.

**GDD sync** — `getSeasonalMultiplier`, `calculateGDDFromDaily`, and `calculateForagingHours` are duplicated verbatim from `src/lib/gdd.ts`. A header comment in the widget points at the source file. If the TypeScript version changes, the widget must be updated manually — flagged for future extraction into a shared package if other embeds emerge.

**Preview** — `public/embed/tcbc-research-widget-preview.html` renders the widget twice (light and dark) for local verification. Visit it via `npm run dev` at `/embed/tcbc-research-widget-preview.html`.

### Still TODO before TCBC go-live

1. **Supabase CORS** — Manually add `https://www.tcbc.ie` and `https://tcbc.ie` to the Supabase project's CORS allow-list via the dashboard. MCP doesn't expose this setting. Without it, the browser will block the REST call from WordPress.
2. **Vercel deployment** — Push to main, let Vercel build, confirm `https://www.hivecraic.com/embed/tcbc-research-widget.js` is reachable and returns `Content-Type: application/javascript`.
3. **Hand-off snippet** — Give the TCBC WP admin the `functions.php` shortcode snippet and the `[tcbc_gdd_widget]` usage instructions.
