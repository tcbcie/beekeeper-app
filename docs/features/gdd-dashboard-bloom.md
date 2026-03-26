# GDD, Forage Bloom & Nectar Conditions on Dashboard Cards

## Overview

Each apiary card on the dashboard now displays four layers of forage intelligence:

1. **Current GDD** — Accumulated Growing Degree Days for the year
2. **Forage Sources** — Plants predicted or confirmed to be in bloom (pollen & nectar sources)
3. **Nectar Conditions** — Good/Fair/Poor rating based on current weather
4. **Foraging Window** — Estimated flyable hours for yesterday, today, and tomorrow

This gives beekeepers an at-a-glance view of forage availability, nectar flow potential, and foraging opportunity for each apiary location.

## Data Sources

### GDD Calculation
- **API:** Open-Meteo Archive API (free, no key required)
- **Endpoint:** `https://archive-api.open-meteo.com/v1/archive`
- **Parameters:** `temperature_2m_max`, `temperature_2m_min` from 1 January to today
- **Formula:** `GDD = sum(max(0, (Tmax + Tmin) / 2) x multiplier)` with seasonal multipliers:
  - January: 0.5x
  - February: 0.75x
  - March-December: 1.0x

### Predicted Blooms
- **Source:** `vegetation_info` table joined to `dropdown_values`
- **Logic:** Dual-filter approach using both GDD range and calendar month:
  - When both `typical_gdd_range` AND `bloom_period` are available: plant must match **both** (strongest signal, fewest false positives)
  - When only one source is available: use whichever data we have
  - `bloom_period` text (e.g., "March–May") is parsed into month ranges, handling parenthetical notes and year-wrapping periods (e.g., "November–April")
- **Sorting:** By nectar value (highest first)
- **Data:** 40+ plants with `typical_gdd_range` values and `bloom_period` text — no user data required

### Confirmed Blooms
- **User observations:** `gdd_records` table for the current year and apiary, where bloom is currently active (start_date <= today, end_date null or >= today)
- **Community observations:** Via `get_shared_gdd_records` RPC, filtered within 20km using Haversine distance, excluding own records

### Nectar Conditions
- **Source:** Open-Meteo Forecast API (same request as existing weather fetch, with extra parameters)
- **Extra parameters:** `relative_humidity_2m` (current), `sunshine_duration` (daily), `precipitation_sum` (daily)
- **Scoring:**

| Factor | Good (2 pts) | Fair (1 pt) | Poor (0 pts) |
|--------|-------------|-------------|--------------|
| Temperature | 15-25°C | 10-15 or 25-30°C | <10 or >30°C |
| Sunshine | >4h | 2-4h | <2h |
| Recent rain (3d) | 2-10mm | 0.5-2 or 10-20mm | 0mm or >20mm |
| Humidity | 40-70% | 30-40 or 70-85% | <30 or >85% |

- **Rating:** Good (6-8), Fair (3-5), Poor (0-2)

### Foraging Window
- **Source:** Open-Meteo Forecast API (`past_days=1` for yesterday, `forecast_days=7` for today onwards)
- **Formula:** `foraging_hours = sunshine_hours × warm_fraction × rain_factor`
  - **Sunshine hours:** `sunshine_duration / 3600`
  - **Warm fraction:** Sinusoidal model estimating fraction of daylight above 12°C (bee flying threshold):
    - `tempMin >= 12°C` → 1.0 (all day above threshold)
    - `tempMax < 12°C` → 0.0 (too cold all day)
    - Otherwise → `1 - acos((2×12 - tempMax - tempMin) / (tempMax - tempMin)) / π`
  - **Rain factor:** `>5mm` → 0.5, `1–5mm` → 0.75, `<1mm` → 1.0
- **Display:** Yesterday, today (colour-coded: green ≥4h, amber ≥2h, grey <2h), and tomorrow

## Caching Strategy

| Cache | Key | TTL | Rationale |
|-------|-----|-----|-----------|
| `gddCache` | `"lat,lon"` | 24 hours | GDD changes minimally per day |
| `bloomDataCache` | Single entry | 24 hours | Reference data, ~30 rows, same for all users |
| `activeBloomCache` | `"apiaryId"` | 1 hour | User + community bloom observations |
| `weatherCache` | `"lat,lon"` | 15 minutes | Existing, now includes extra fields |

All caches are module-level (shared across all card instances) and gated by IntersectionObserver (lazy-loaded only when the card enters the viewport).

## UI Design

The forage row appears between the weather forecast section and the hive stats row:

```
[Thermometer] 342 GDD  |  Forage: [Flower] [Clover] [Hawthorn] [Borage] +1 more
Nectar: Good  |  Foraging window: Yday 3.2h · Today 5.1h · Tmrw 4.8h
```

- **"Forage:" label** before bloom pills — clarifies these are pollen & nectar sources
- **Predicted blooms:** Green pills (`bg-green-100`), clickable to open plant info modal
- **Confirmed blooms:** Amber pills (`bg-amber-100`) with a checkmark icon
- **Expandable pills:** Shows 3 by default; "+N more" expands to show all, "less" collapses
- **Stale bloom filtering:** Confirmed blooms past their season (GDD > max×1.2 or outside calendar window) are automatically hidden
- **Nectar label:** Colour-coded (green/amber/grey)
- **Foraging window:** Yesterday (muted), today (colour-coded), tomorrow (muted)
- **Background:** Subtle green tint (`bg-green-50/50`)

Only renders when the apiary has coordinates and GDD data loaded successfully.

## Files

| File | Role |
|------|------|
| `src/lib/gdd.ts` | Shared utility: GDD calculation, bloom matching, nectar scoring, foraging hours, range parsing, Haversine distance |
| `src/components/dashboard/ApiaryWeatherRow.tsx` | Dashboard card with forage row |

## Edge Cases

- **No coordinates:** Row not rendered
- **API failure:** Row not rendered (silent failure)
- **No plants in bloom:** Shows GDD value + nectar conditions only
- **Community data unavailable:** Shows predicted blooms only
- **Wide GDD ranges (e.g., Erica 200-1200):** Correctly shows across full season
