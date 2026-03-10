# DCA (Drone Congregation Area) Prediction

## Overview

Predicts likely Drone Congregation Areas near user apiaries based on terrain elevation analysis. Displayed as a rose/pink toggleable layer on the community map.

## How It Works

1. **Terrain sampling** — For each selected apiary, 48 elevation points are sampled (16 compass directions at 1km, 2.5km, and 4km)
2. **Flyway detection** — Directions with lowest average elevation are identified as drone flyways (drones fly toward the lowest horizon)
3. **Candidate projection** — DCA candidates are placed along flyways at 2km and 3.5km from the apiary
4. **Scoring (0-100):**
   - **Bowl score (0-40):** Is the candidate in a terrain depression?
   - **Donut score (0-20):** Is it in the 2-4km sweet spot from an apiary?
   - **Convergence score (0-40):** Do flyways from multiple apiaries converge here?
5. **Filtering** — Only predictions scoring above 40 are shown, merged within 500m, top 5 returned

## User Interface

- Toggle in the community map visibility filters panel (rose crosshair icon)
- When enabled, an apiary selector panel appears with checkboxes
- User selects apiaries and clicks "Predict DCAs"
- Rose/pink circles appear on the map with dashed flyway lines from apiaries
- Click a DCA marker to see score, confidence, direction, and contributing apiaries

## Confidence Levels

| Score | Confidence | Display Radius |
|-------|-----------|----------------|
| 70+   | High      | 0.5 km         |
| 55-69 | Medium    | 0.75 km        |
| 40-54 | Low       | 1 km           |

## Technical Details

- **API:** Open-Meteo Elevation API (free, no key needed)
- **Caching:** localStorage with 24-hour TTL, keyed by apiary IDs + coordinates
- **API budget:** ~70 points per apiary (48 terrain samples + ~20 bowl checks)
- **Apiary limit:** Maximum 10 per calculation
- **No database tables or API routes required** — entirely client-side

## Files

| File | Purpose |
|------|---------|
| `src/lib/elevation.ts` | `fetchElevationBatch()` — batch elevation API calls |
| `src/lib/dca-prediction.ts` | Pure prediction algorithm |
| `src/hooks/useDCAPredictions.ts` | React hook with caching |
| `src/app/dashboard/community-map/page.tsx` | Map integration |

## Edge Cases

- **No apiaries with coordinates:** DCA toggle hidden
- **Flat terrain:** Predictions in cardinal directions at lower confidence
- **API failure:** Error message in selector panel, no predictions shown
- **10+ apiaries:** First 10 used, info note displayed

## Limitations

- Predictions are estimates based on elevation data only
- Does not account for wind patterns, vegetation, or urban areas
- Always verify potential DCAs with field observations
- "Estimated — verify in field" note shown in all popups
