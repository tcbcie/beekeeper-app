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
   - **Aspect** (added 12/11/2026) - south-facing ground scores up to +3, north-facing ground down to -3. Worked out from the heights 500 m to the north and south of the candidate; 20 m of rise counts as fully south-facing
   - **Wind shelter** (added 12/11/2026) - higher ground on the south-west side scores up to +3, lower ground there down to -3. The prevailing wind is taken as south-westerly, which holds for Ireland and Britain; 15 m of higher ground 500 m upwind counts as full shelter
5. **Confirmation priors** - Nearby confirmations are converted into bounded local priors that add positive support or negative suppression according to proximity, recency, and clustering.
6. **Water check** - A candidate on open sea is dropped. The elevation service reports exactly 0 m over sea, so a point at 0 m with at least half of its surroundings also at 0 m counts as sea. Lakes sit above sea level and are not detected.
7. **Reinforcement and filtering** - Hotspots can be weakly reinforced by nearby apiaries, filtered by score threshold, and merged within 500 m. Each selected apiary keeps its own best hotspot; the rest fill up to 5 results, so apiaries far apart are not crowded out.

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
| Aspect | South-facing ground up, north-facing ground down (-3 to +3) |
| Wind shelter | Sheltered from the south-west up, exposed to it down (-3 to +3) |
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

- "Drone congregation areas" switch in the community map's Layers panel
- When on, the panel lists the user's apiaries (own and team) with tick-boxes; the ticked apiaries are remembered on the device
- User ticks apiaries and taps `Predict DCAs`. On success the panel closes, a message says how many sites were found, and the map moves to show them
- Predicted hotspots appear as rose circles with dashed flyway lines from contributing apiaries
- Popup content includes direction, score, confidence, contributing apiaries, and a compact `Signals:` summary showing the strongest landscape evidence
- When thresholding would otherwise remove every result, the map shows one low-confidence "best guess" hotspot instead of silently showing nothing

## Technical Details

- **Execution:** Scoring runs in the browser; terrain heights come through the app's own server route
- **Terrain data:** `POST /api/elevation` (Open-Meteo behind it, cached on the server for 30 days, up to 1,000 points per call). See `apiary-elevation.md`
- **Caching:** `localStorage` with the `dca-predictions-v6-` cache namespace keyed by apiary coordinates and confirmation state, kept for 24 hours. An empty result is never cached. The cache is cleared whenever a sighting is added or removed
- **Apiary limit:** Maximum 10 selected apiaries per calculation
- **Database:** Existing `dca_confirmations` table remains the field-evidence source

## Files

| File | Purpose |
|------|---------|
| `src/lib/elevation.ts` | Batch elevation lookups, sent to `/api/elevation` |
| `src/app/api/elevation/route.ts` | Server route: sign-in, rate limit, lookup and caching |
| `src/lib/dca-prediction.ts` | Phase 3 landscape-aware prediction engine with confirmation priors |
| `src/hooks/useDCAPredictions.ts` | Hook, confirmation loading, and cache-keyed prediction flow |
| `src/app/dashboard/community-map/page.tsx` | Map integration and popup display |
| `tests/lib/dca-prediction.test.ts` | Engine tests against a made-up landscape |

## Field Confirmation

Beekeepers record what they find in the field in three ways:

- **Answer a hotspot** - "Drones seen" or "No drones" in a hotspot's popup, including the best-guess hotspot
- **Record a DCA sighting** - the button in the Layers panel, then a tap on the map where drones were gathering, with an optional note. This works anywhere, not only on a predicted hotspot
- **Remove an answer or sighting** - "Remove my answer" / "Remove sighting" in the popup, after a confirmation prompt. To change an answer, remove it and answer again

A hotspot is coloured green (drones seen) or grey (no drones) when one of the user's sightings lies inside its circle. Sightings outside every hotspot on show appear as their own ring markers. After a sighting is saved or removed, the prediction on show is worked out again straight away.

### Current Behaviour

- Positive confirmations are treated as local priors with recency and distance decay rather than as a late score bump
- DCAs stay in the same place for many years, so a confirmed sighting never fades below 70% weight. "No drones" answers still fade with age, down to 30% after two years
- Nearby same-polarity confirmations are clustered before scoring so duplicate records do not inflate support linearly
- Clustered or recent confirmations reinforce a hotspot more strongly than isolated or stale records
- Negative confirmations suppress score and confidence locally, but do not act as absolute bans
- A confirmed sighting within 5 km of a selected apiary seeds a hotspot when no terrain-generated candidate lands nearby. A sighting further away is ignored for that selection
- The lower score threshold for sighting-backed hotspots applies only to candidates a sighting actually backs
- A valid selected apiary can preserve one low-confidence fallback hotspot if normal filtering would otherwise return no visible result
- Confirmations remain user-private only

## Edge Cases

- **No apiaries with coordinates:** DCA toggle remains hidden
- **Flat terrain:** The engine still returns ranked guesses, but confidence is deliberately held down
- **Threshold collapse:** If normal filtering removes every candidate for a valid selected apiary, the strongest candidate can be preserved as a low-confidence fallback
- **Sparse support:** Single-apiary candidates usually remain low confidence
- **Elevation service unreachable:** When no heights come back at all, the panel says "Could not get terrain heights. Check your signal and try again." and nothing is cached
- **Sighting not saved:** A message says so; a repeat of the same answer within 50 m and 7 days is reported as already recorded
- **10+ apiaries selected:** First 10 are used

## Limitations

- The engine is still limited to what can be inferred from the current elevation source
- Phase 2 adds richer derived terrain signals, but it still does not use external land-cover, vegetation, weather, or true line-feature datasets
- Open-Meteo elevation data is useful for broad terrain structure, not fine-grained local verification
- Aspect and wind shelter have not been checked against known DCAs: no confirmed sighting existed in the database when they were added, so their weights are deliberately small. Review them once a few real DCAs are recorded
- The wind direction is a fixed south-westerly, not measured per site. An apiary outside Ireland and Britain, or a valley that funnels wind differently, is not allowed for
- Field checks still matter; the map output is a planning aid, not proof of a true DCA
