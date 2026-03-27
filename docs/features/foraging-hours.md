# Foraging Hours — Research Tab

## Overview

A new tab in the Research section that displays historical foraging hours data with year-over-year comparison. Uses the existing `calculateForagingHours()` engine from `src/lib/gdd.ts` applied to historical weather data from the Open-Meteo Archive API.

## Data Source

- **API:** Open-Meteo Archive API (`archive-api.open-meteo.com/v1/archive`)
- **Parameters fetched per day:** `temperature_2m_max`, `temperature_2m_min`, `sunshine_duration`, `precipitation_sum`
- **Location:** First apiary with GPS coordinates (same pattern as GDD Data tab)
- **Calculation:** `calculateForagingHours(tempMin, tempMax, sunshineDuration, precipitationSum)` — already exists in `src/lib/gdd.ts`

## Chart Types

### 1. Accumulation Chart (Line)

Cumulative foraging hours from 1 January, plotted as a line chart with one line per selected year.

- **X-axis:** Months (Jan–Dec), ticks every 7 days
- **Y-axis:** Cumulative foraging hours
- **Lines:** One per selected year (current year bold 3px, past years 2px)
- **Fair comparison:** Past years truncated to current day-of-year
- **Reference line:** Red dashed horizontal line showing current year's total foraging hours to date
- **Colours:** Same `YEAR_COLORS` palette as GDD Data tab

### 2. Monthly Comparison Chart (Bar)

Grouped bar chart showing total foraging hours per month, with one bar per selected year.

- **X-axis:** Months (Jan–Dec)
- **Y-axis:** Total foraging hours for that month
- **Bars:** One bar per year per month, grouped
- **Data labels:** Show hours value on each bar
- **Colours:** Same `YEAR_COLORS` palette
- **Period filter:** Quarter (Q1–Q4) or custom month selection

### Optional: Temperature Overlay

Toggle to show average monthly temperature as a secondary Y-axis line on the accumulation chart (same pattern as GDD Data).

## UI Layout

Follows GDD Data tab patterns exactly:

- **Apiary selector** (if user has multiple apiaries with coordinates)
- **Chart type toggle:** Accumulation | Monthly
- **Year selector chips:** Current year + 4 previous years (default: current + 1 prior)
- **Period filter:** Q1/Q2/Q3/Q4/Custom month picker
- **Temperature toggle** (accumulation view only)
- **Chart area** with Chart.js (react-chartjs-2)

## Access Control

- Available to all authenticated users (same as GDD Data tab — not power-user gated)
- Requires at least one apiary with latitude/longitude set

## Components

| File | Purpose |
|------|---------|
| `src/components/research/ForagingHoursTab.tsx` | Main tab component (new) |
| `src/app/dashboard/research/page.tsx` | Add tab to Research page (modify) |
| `src/lib/gdd.ts` | Existing `calculateForagingHours()` — no changes needed |

## Data Flow

1. User selects apiary (or auto-selects first with coordinates)
2. For each selected year, fetch daily weather from Open-Meteo Archive API
3. Calculate foraging hours per day using `calculateForagingHours()`
4. **Accumulation view:** Running cumulative sum, plot every 7th day
5. **Monthly view:** Sum foraging hours per calendar month
6. Render charts with Chart.js, matching GDD Data styling

## Implementation Notes

- Reuse the same Open-Meteo fetch pattern from GDDDataTab (daily params, timezone)
- Reuse `YEAR_COLORS` array and chart configuration patterns
- No new database tables required — all data is computed from weather API
- No new API routes required — client-side fetching only
- Tab icon: `Sun` from lucide-react (represents sunshine/foraging conditions)
