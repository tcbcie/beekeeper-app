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
- **Database:** `dca_confirmations` table stores field observations (user-scoped with RLS)

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

## Field Confirmation

Beekeepers can confirm or deny DCA predictions based on real-world observations, creating a feedback loop that improves scoring accuracy over time.

### How It Works

- Click a DCA marker popup to see "Drones seen" / "No drones" buttons
- Clicking either button saves a confirmation record to the database
- On the next prediction calculation, confirmations within 1km of a prediction adjust its score:
  - **Positive confirmation:** +15 to score
  - **Negative confirmation:** -15 to score
- Scores are clamped to 0-100 and predictions below 40 are filtered out

### Scoring Breakdown

| Component | Points | Source |
|-----------|--------|--------|
| Bowl shape | 0-40 | Terrain elevation |
| Donut distance | 0-20 | Distance from apiary |
| Convergence | 0-40 | Multiple apiaries |
| Field confirmation | +/-15 | User observation |

### Visual Indicators

- **Rose/pink marker** — unconfirmed prediction (default)
- **Green marker** — confirmed DCA (drones observed)
- **Grey marker** — denied DCA (no drones observed)

### Candidate Injection

Positive confirmations ("drones seen") at locations the terrain model missed are injected as new candidates directly into the prediction engine:

1. After terrain candidates are generated, each positive confirmation is checked against existing candidates
2. If no terrain candidate exists within 1km, the confirmation is injected as a new candidate
3. The nearest apiary is found and the bearing from it determines the direction label
4. Injected candidates go through normal bowl/donut/convergence scoring — terrain still has a say
5. The existing +15 confirmation bonus is then applied on top by post-processing

This means field-verified DCA locations appear in future predictions even when terrain analysis alone wouldn't find them. A confirmed location in a genuine terrain bowl scores higher than one on flat ground.

Negative confirmations ("no drones") are not injected — they only suppress via the existing -15 post-processing adjustment.

**Skip logic:** If a positive confirmation is within 1km of an existing terrain candidate, it is not injected (the terrain candidate already covers that area and receives the +15 bonus).

### Privacy

Confirmations are user-private only. Each beekeeper's observations affect only their own prediction scores. No community sharing of confirmations in this iteration.

## Limitations

- Predictions are estimates based on elevation data only
- Does not account for wind patterns, vegetation, or urban areas
- Always verify potential DCAs with field observations
- Unconfirmed popups show "Drones seen" / "No drones" buttons for field verification
