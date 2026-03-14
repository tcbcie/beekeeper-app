# Dashboard Apiary Weather Cards

## Overview
Each apiary is displayed as a multi-line card on the main dashboard showing the apiary name with location, live weather, operational stats, queenright recency, and scale weight data.

## Card Layout

### Line 1 - Header
MapPin icon + **Apiary Name** (City/Location) linking to the apiary detail page. Current weather icon and temperature are shown on the right.

### Line 2 - 7-Day Forecast
Horizontally scrollable row of daily forecasts: day abbreviation, weather emoji, and high/low temperatures.

### Line 3 - Stats
- Hive count
- Last inspection recency, colour-coded: green (<7 days), amber (7-13 days), red (14+ days), grey (never)
- Queenright recency based on the latest apiary inspection where either `queen_seen` or `eggs_present` is true
- Queenright warning treatment when that positive signal is older than 21 days
- Active task pill when incomplete apiary tasks exist

### Line 4 - Scale Weights (conditional)
Only displayed if the apiary has hives with connected scales (BEEP or Wolf Waagen). Shows average weight change across all scales: 24h, 7d, and 30d. Green indicates gain and red indicates loss.

## Data Sources

### Weather
- **Open-Meteo Forecast API** (free, no auth): `https://api.open-meteo.com/v1/forecast`
- Parameters: `current=temperature_2m,weather_code`, `daily=temperature_2m_max,temperature_2m_min,weather_code`, `timezone=Europe/Dublin`, `forecast_days=7`
- Requires GPS coordinates on the apiary and is hidden gracefully if coordinates are missing

### Hive and Queenright Stats
- Active hive count from the `hives` table, excluding archived hives
- Last inspection date from the latest inspection across all hives in the apiary
- Last queenright date from the latest inspection across apiary hives where either `queen_seen` or `eggs_present` is true
- Nullable inspection flags are treated defensively, so null does not count as a queenright signal

### Scale Data
- Fetched via the existing `/api/beep/data` and `/api/wolf-waagen/data` API routes
- Returns weight changes for 24h, 7d, and 30d
- Averaged across all scales when multiple hives have scales

## Edge Cases
- Apiaries without GPS show a small cloud-off icon instead of weather data
- Apiaries with 0 hives show a neutral dash for inspection and queenright recency
- Apiaries with hives but no inspection recording `queen_seen` or `eggs_present` show `No record` for queenright
- Apiaries with a queenright signal older than 21 days show a warning treatment
- Invalid date strings degrade safely to a neutral fallback instead of rendering a broken age
- Scale API failures are skipped; `No data` is shown if no scale readings can be rendered
- Apiaries without scales omit the scale row entirely

## Files
- `src/types/dashboard.ts` - `DashboardApiary`, `DashboardApiaryScale`, and dashboard inspection typing
- `src/hooks/useDashboardStats.ts` - dashboard apiary fetch, enrichment, and defensive error bubbling
- `src/components/dashboard/ApiaryWeatherRow.tsx` - dashboard apiary card rendering and queenright warning display
- `src/app/dashboard/page.tsx` - "My Apiaries" section that renders the cards
