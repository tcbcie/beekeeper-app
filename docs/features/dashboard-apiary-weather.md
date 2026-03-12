# Dashboard Apiary Weather Cards

## Overview
Each apiary is displayed as a multi-line card on the main dashboard showing the apiary name with location, live weather, stats, and scale weight data.

## Card Layout

### Line 1 — Header
MapPin icon + **Apiary Name** (City/Location) — links to apiary detail page. Current weather icon and temperature on the right.

### Line 2 — 7-Day Forecast
Horizontally scrollable row of daily forecasts: day abbreviation, weather emoji, high/low temperatures.

### Line 3 — Stats
- Hive count badge (amber)
- Last inspection badge — colour-coded: green (<7 days), amber (7–14 days), red (14+ days), grey (never)

### Line 4 — Scale Weights (conditional)
Only displayed if the apiary has hives with connected scales (BEEP or Wolf Waagen). Shows average weight change across all scales: 24h, 7d, 30d. Green for gain, red for loss.

## Data Sources

### Weather
- **Open-Meteo Forecast API** (free, no auth): `https://api.open-meteo.com/v1/forecast`
- Parameters: `current=temperature_2m,weather_code`, `daily=temperature_2m_max,temperature_2m_min,weather_code`, `timezone=Europe/Dublin`, `forecast_days=7`
- Requires GPS coordinates on the apiary (gracefully hidden if missing)

### Hive Stats
- Active hive count from `hives` table (excludes archived)
- Last inspection date — latest across all hives in the apiary from `inspections` table

### Scale Data
- Fetched via existing `/api/beep/data` and `/api/wolf-waagen/data` API routes
- Returns weight changes: 24h, 7d, 30d
- Averaged across all scales when multiple hives have scales

## Edge Cases
- Apiaries without GPS: weather section shows a small cloud-off icon
- Apiaries with 0 hives: hive count shows "0 hives", no inspection badge
- Scale API failures: individual scale errors are silently skipped; "No scale data" shown if all fail
- No scales configured: line 4 is entirely hidden

## Files
- `src/types/dashboard.ts` — `DashboardApiary`, `DashboardApiaryScale` types
- `src/hooks/useDashboardStats.ts` — apiary list fetch + enrichment
- `src/components/dashboard/ApiaryWeatherRow.tsx` — multi-line weather card component
- `src/app/dashboard/page.tsx` — "My Apiaries" section
