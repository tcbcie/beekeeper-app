# DCA (Drone Congregation Area) Prediction

## Overview

Predicts likely Drone Congregation Area hotspots near user apiaries on the community map. The current engine is a client-side, evidence-weighted ranking model that combines terrain-derived directional suitability, broader distance scoring, candidate-level landscape signals, modest cross-apiary reinforcement, and user-private confirmation priors.

The output should be treated as a ranked hotspot estimate, not a verified point location.

## How It Works

1. **Terrain sampling** - For each selected apiary, the engine samples elevation in 16 directions at 1 km, 2.5 km, and 4 km.
2. **Directional landscape scoring** - Each direction is scored from:
   - **Low horizon support** - lower terrain relative to the surrounding horizon
   - **Skyline contrast** - stronger gap or contrast against neighbouring directions
   - **Valley opening** - terrain that opens outward instead of staying uniformly enclosed
3. **Candidate generation** - Candidate hotspots are projected across a broader distance band at 1 km, 1.8 km, 2.6 km, 3.4 km, and 4.2 km from each selected apiary.
4. **Candidate landscape scoring** - Each candidate is evaluated from nearby terrain context using:
   - **Terrain support** - local depression or relief support
   - **Saddle support** - pass or junction-like support from opposing terrain openings
   - **Sheltered opening** - moderate enclosure and surrounding structure rather than full exposure or full closure
5. **Confirmation priors** - Nearby confirmations are converted into bounded local priors that add positive support or negative suppression according to proximity, recency, and clustering.
6. **Reinforcement and filtering** - Hotspots can be weakly reinforced by nearby apiaries, filtered by score threshold, merged within 500 m, and limited to the top 5 results.

## Current Score Components

The current phase 3 model combines these signals:

| Signal | Role |
|--------|------|
| Distance suitability | Broad fit to the likely DCA distance range |
| Low horizon support | Lower terrain relative to surrounding directions |
| Skyline contrast | Distinct landscape gap rather than merely low ground |
| Valley opening | Outward terrain opening from the source apiary |
| Terrain support | Local relief around the candidate point |
| Saddle support | Pass or junction-like structure near the candidate |
| Sheltered opening | Moderate enclosure and terrain variability |
| Cross-apiary support | Weak reinforcement when several apiaries support the same hotspot |
| Confirmation support | Recency-weighted positive field evidence near the candidate |
| Confirmation suppression | Recency-weighted negative field evidence that can hold confidence down |

## Confidence Levels

Confidence is based on the number and strength of independent signals rather than raw score alone.

- **High** - several strong signals, cross-apiary support, and no flat or fallback-heavy context
- **Medium** - moderate support from multiple signals
- **Low** - best local guess only, weak support, flat terrain, fallback-heavy conditions, or an explicit preserved fallback hotspot

Display radius remains:

| Confidence | Display Radius |
|------------|----------------|
| High       | 0.5 km         |
| Medium     | 0.75 km        |
| Low        | 1 km           |

## User Interface

- Toggle in the community map visibility filters panel
- When enabled, an apiary selector panel appears with checkboxes
- User selects apiaries and clicks `Predict DCAs`
- Predicted hotspots appear as rose circles with dashed flyway lines from contributing apiaries
- Popup content includes score, confidence, contributing apiaries, and a compact `Signals:` summary showing the strongest landscape evidence
- When thresholding would otherwise remove every result, the panel can still show a low-confidence fallback hotspot instead of silently showing nothing

## Technical Details

- **Execution:** Entirely client-side
- **Terrain data:** Open-Meteo Elevation API
- **Caching:** `localStorage` with the `dca-predictions-v5-` cache namespace keyed by apiary coordinates and confirmation state
- **Apiary limit:** Maximum 10 selected apiaries per calculation
- **Database:** Existing `dca_confirmations` table remains the field-evidence source

## Files

| File | Purpose |
|------|---------|
| `src/lib/elevation.ts` | Batch elevation lookups |
| `src/lib/dca-prediction.ts` | Phase 3 landscape-aware prediction engine with confirmation priors |
| `src/hooks/useDCAPredictions.ts` | Hook, confirmation loading, and cache-keyed prediction flow |
| `src/app/dashboard/community-map/page.tsx` | Map integration and popup display |

## Field Confirmation

Beekeepers can still confirm or deny DCA hotspots from the map popups.

### Current Behaviour

- Positive confirmations are treated as local priors with recency and distance decay rather than as a late score bump
- Nearby same-polarity confirmations are clustered before scoring so duplicate records do not inflate support linearly
- Clustered or recent confirmations reinforce a hotspot more strongly than isolated or stale records
- Negative confirmations suppress score and confidence locally, but do not act as absolute bans
- Recent positive confirmations can still seed a plausible hotspot when no terrain-generated candidate lands nearby
- A valid selected apiary can preserve one low-confidence fallback hotspot if normal filtering would otherwise return no visible result
- Confirmations remain user-private only

## Edge Cases

- **No apiaries with coordinates:** DCA toggle remains hidden
- **Flat terrain:** The engine still returns ranked guesses, but confidence is deliberately held down
- **Threshold collapse:** If normal filtering removes every candidate for a valid selected apiary, the strongest candidate can be preserved as a low-confidence fallback
- **Sparse support:** Single-apiary candidates usually remain low confidence
- **API failure:** Error message in the selector panel and no predictions shown
- **10+ apiaries selected:** First 10 are used

## Limitations

- The engine is still limited to what can be inferred from the current elevation source
- Phase 2 adds richer derived terrain signals, but it still does not use external land-cover, vegetation, weather, or true line-feature datasets
- Open-Meteo elevation data is useful for broad terrain structure, not fine-grained local verification
- Field checks still matter; the map output is a planning aid, not proof of a true DCA
