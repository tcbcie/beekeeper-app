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
  - `Healthy` when every hive in the apiary has a recent queenright signal
  - `Possible issue` when any hive lacks a recent queenright signal or has a broodless run older than 21 days
- Warning detail text showing how many hives are affected and whether the concern is queen signal, brood, or both
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
- A hive is flagged for queen-signal risk when it has no queenright signal in the last 21 days
- A hive is flagged for brood risk only when a confirmed broodless run has lasted more than 21 days
- Recent broodless inspections do not immediately trigger a brood warning, which avoids overreacting to short summer brood breaks
- Nullable inspection fields are treated defensively and do not count as positive evidence

### Scale Data
- Fetched via the existing `/api/beep/data` and `/api/wolf-waagen/data` API routes
- Returns weight changes for 24h, 7d, and 30d
- Averaged across all scales when multiple hives have scales

## Edge Cases
- Apiaries without GPS show a small cloud-off icon instead of weather data
- Apiaries with 0 hives show a neutral dash for inspection and queen status
- Apiaries with one healthy hive and one risky hive now show `Possible issue`; healthy hives no longer hide risky ones
- Apiaries with recent broodless inspections only show a brood warning once the confirmed broodless run exceeds 21 days
- Invalid date strings degrade safely to a neutral fallback instead of rendering a broken age
- Scale API failures are skipped; `No data` is shown if no scale readings can be rendered
- Apiaries without scales omit the scale row entirely

## Files
- `src/types/dashboard.ts` - `DashboardApiary`, `DashboardApiaryScale`, and dashboard inspection typing
- `src/hooks/useDashboardStats.ts` - dashboard apiary fetch, per-hive signal roll-up, and defensive error bubbling
- `src/components/dashboard/ApiaryWeatherRow.tsx` - dashboard apiary card rendering and warning display
- `src/app/dashboard/page.tsx` - "My Apiaries" section that renders the cards
