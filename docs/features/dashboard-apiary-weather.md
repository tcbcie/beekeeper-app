# Dashboard Apiary Weather Cards

## Overview
Each apiary is displayed as a multi-line card on the main dashboard showing the apiary name with location, live weather, operational stats, queen-status risk, and scale weight data.

## Card Layout

### Line 1 - Header
MapPin icon + **Apiary Name** (City/Location) linking to the apiary detail page. Current weather icon and temperature are shown on the right.

### Line 2 - 7-Day Forecast
Horizontally scrollable row of daily forecasts: day abbreviation, weather emoji, and high/low temperatures.

### Line 3 - Stats
- Hive count
- Last inspection recency, colour-coded: green (<7 days), amber (7-13 days), red (14+ days), grey (never)
- Queen status block:
  - `Healthy` when every hive in the apiary has a recent queenright signal and none are user-confirmed queenless
  - `Possible issue` when any hive is user-confirmed queenless, lacks a recent queenright signal, or has a broodless run older than 21 days
- Warning detail text showing how many hives are affected. User-confirmed queenless hives are named with their reason (e.g. `1 hive queenless (Swarmed)`) so the dashboard wording matches the red badge on the hive card. Inspection-derived risk hives use the older `lack queen signal` / `no brood 21+d` wording. When both kinds of risk are present, the strings are concatenated
- Active task pill when incomplete apiary tasks exist

### Line 4 - Scale Weights (conditional)
Only displayed if the apiary has hives with connected scales (BEEP or Wolf Waagen). Shows average weight change across all scales: 24h, 7d, and 30d. Green indicates gain and red indicates loss.

## Data Sources

### Weather
- **Open-Meteo Forecast API** (free, no auth): `https://api.open-meteo.com/v1/forecast`
- Parameters: `current=temperature_2m,weather_code`, `daily=temperature_2m_max,temperature_2m_min,weather_code`, `timezone=Europe/Dublin`, `forecast_days=7`
- Requires GPS coordinates on the apiary and is hidden gracefully if coordinates are missing

### Hive and Queen Status Signals
- Active hive count from the `hives` table, excluding archived hives
- Last inspection date from the latest inspection across all hives in the apiary
- Queenright signal from inspections where either `queen_seen` or `eggs_present` is true
- Brood signal from inspections where either `eggs_present` is true or `brood_frames > 0`
- Apiary warning counts are derived per hive rather than from one shared apiary date

### Queen Issue Rules
- A hive flagged `is_queenless=true` (see `hive-queenless-flag.md`) is the source of truth for queen presence and is reported separately as a confirmed-queenless count, with the chosen reason surfaced inline
- A hive is flagged for queen-signal risk only when `is_queenless=false` **and** it has no queenright signal in the last 21 days. The inspection heuristic never re-flags a hive the user has already classified
- A hive is flagged for brood risk only when `is_queenless=false` **and** a confirmed broodless run has lasted more than 21 days. A queenless hive without brood is an expected state, not a separate alarm
- Recent broodless inspections do not immediately trigger a brood warning, which avoids overreacting to short summer brood breaks
- Nullable inspection fields are treated defensively and do not count as positive evidence

### Scale Data
- Fetched via the existing `/api/beep/data` and `/api/wolf-waagen/data` API routes
- Returns weight changes for 24h, 7d, and 30d
- Averaged across all successfully loaded scales when multiple hives have scales

## Edge Cases
- Apiaries without GPS show a small cloud-off icon instead of weather data
- Apiaries with 0 hives show a neutral dash for inspection and queen status
- Apiaries with one healthy hive and one risky hive now show `Possible issue`; healthy hives no longer hide risky ones
- An apiary with a user-confirmed-queenless hive **and** a separate inspection-stale hive shows both in the summary (e.g. `1 hive queenless (Swarmed), 1 hive lack queen signal`), so the dashboard wording always matches reality
- Apiaries with recent broodless inspections only show a brood warning once the confirmed broodless run exceeds 21 days
- Invalid date strings degrade safely to a neutral fallback instead of rendering a broken age
- Scale API failures are skipped per hive; successful scale readings remain visible and `No data` is shown only if no scale readings can be rendered
- Apiaries without scales omit the scale row entirely

## Files
- `src/types/dashboard.ts` - `DashboardApiary`, `DashboardApiaryScale`, and dashboard inspection typing
- `src/hooks/useDashboardStats.ts` - dashboard apiary fetch, per-hive signal roll-up, and defensive error bubbling
- `src/components/dashboard/ApiaryWeatherRow.tsx` - dashboard apiary card rendering and warning display
- `src/lib/queenless.ts` - shared reason list and `formatQueenlessShortLabel` helper used by both the hive badge and the dashboard summary
- `src/sql/create_dashboard_rpc_functions.sql` - `get_dashboard_overview` RPC, including the `confirmed_queenless` CTE that emits `queenlessConfirmedHiveCount` and `queenlessConfirmedReasons` per apiary
- `src/app/dashboard/page.tsx` - "My Apiaries" section that renders the cards
