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
   - **Other colonies nearby** (added 12/11/2026) - up to +3 for other beekeepers' hives within 6 km of the candidate, nearer hives counting for more; about 20 weighted hives earn the full 3. Only the shared-apiaries layer is used, so a prediction does not depend on the viewer's role. Those positions are offset by up to 5 km, so this is a wide, weak signal: it lifts hotspots in areas with many colonies more than it chooses between hotspots of one apiary
5. **Confirmation priors** - Nearby confirmations are converted into bounded local priors that add positive support or negative suppression according to proximity, recency, and clustering.
6. **Water check** - A candidate on open sea is dropped. The elevation service reports exactly 0 m over sea, so a point at 0 m with at least half of its surroundings also at 0 m counts as sea. Lakes sit above sea level and are not detected here; the land-cover step below catches them.
7. **Land cover** (added 13/11/2026) - For the hotspots about to be shown (not every candidate), the engine asks Mapbox what is on the ground:
   - **On water** (lake, river, reservoir, sea) - the hotspot is dropped and the next best takes its place, unless the beekeeper reported it themselves. This catches the lakes the height check cannot see
   - **Inside woodland** - 4 points off
   - **Open ground with woodland within 300 m** - 3 points on
   - **Could not be looked up** - no change
   Replacements are looked up in turn, at most three rounds
8. **Reinforcement and filtering** - Hotspots can be weakly reinforced by nearby apiaries, filtered by score threshold, and merged within 500 m. Each selected apiary keeps its own best hotspot; the rest fill up to 5 results, so apiaries far apart are not crowded out.

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
| Other colonies nearby | Other beekeepers' shared hives within 6 km (0 to +3) |
| Land cover | Inside woodland -4, woodland edge within 300 m +3; on water the hotspot is dropped |
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
- **Caching:** `localStorage` with the `dca-predictions-v8-` cache namespace keyed by apiary coordinates, confirmation state and the shared apiaries nearby, kept for 24 hours. An empty result is never cached. The cache is cleared whenever a sighting is added or removed
- **Land cover:** Mapbox Tilequery API, called from the browser with the map key the app already uses (`mapbox-streets-v8` water and landuse, `mapbox-terrain-v2` landcover). One request per hotspot shown, usually 5 to 15 for a prediction that is not already saved on the device. Requests are billed by Mapbox per request and limited to 600 a minute
- **Apiary limit:** Maximum 10 selected apiaries per calculation
- **Database:** Existing `dca_confirmations` table remains the field-evidence source

## Files

| File | Purpose |
|------|---------|
| `src/lib/elevation.ts` | Batch elevation lookups, sent to `/api/elevation` |
| `src/app/api/elevation/route.ts` | Server route: sign-in, rate limit, lookup and caching |
| `src/app/api/admin/dca-sightings/unshare/route.ts` | Admin route that takes a sighting off the shared map |
| `src/lib/land-cover.ts` | Water and woodland lookups for the hotspots on show |
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
- A sighting is private unless its owner chooses to share it (see Sharing a sighting). Shared sightings from other beekeepers are shown on the map but do not feed the prediction, because their positions are offset

### Sharing a sighting (added 12/11/2026)

Sharing is the beekeeper's choice for each sighting, and is off unless they tick it.

- **When recording:** a "Share with other beekeepers" tick-box on the sighting card, unticked by default
- **Afterwards:** "Share with other beekeepers" / "Stop sharing" in the popup of any of their own "drones seen" sightings, including an answered hotspot
- **Only "drones seen" can be shared.** A "no drones" answer stays private; the database refuses to share one
- **What others see:** a sky-blue ring in the "Shared DCA sightings" layer, moved by up to 1 km (reduced from 5 km on 13/11/2026 so the place can still be found), in a fixed, salted direction per sighting, and the year. No name, no note, no exact date
- **No approval step.** Nothing typed by a beekeeper is shown to others; a beekeeper can stop sharing at any time, and removing the sighting removes it for everyone
- **Moderation (added 13/11/2026):** an Admin sees a "Remove from shared map" button in a shared sighting's popup. After a confirmation prompt the sighting stops being shared; it is not deleted, and its owner keeps it as a private sighting. The removal is written to the admin audit log (`dca_sighting_unshared`). The owner is not told and is not stopped from sharing it again. Route: `POST /api/admin/dca-sightings/unshare`. `get_shared_dca_sightings()` returns the row id to Admins only (NULL for everyone else) so the route knows which sighting is meant; migration `20261113110000_dca_shared_sightings_admin_id.sql` (applied)
- **Database:** `dca_confirmations.is_shared` (default false) and `get_shared_dca_sightings()`, which returns other beekeepers' shared sightings to signed-in users only. Migrations `supabase/migrations/20261112200000_dca_sightings_opt_in_sharing.sql` and `20261113100000_dca_shared_sightings_one_km_offset.sql` (both applied). The function works the offset out itself: `obfuscate_coordinates()` rounds to two decimal places, which alone would move a point by more than 1 km

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
- Land cover is checked only for the hotspots about to be shown, so it can remove or re-rank them but does not search for better ground elsewhere. Hedgerows, single tree lines and weather are not used
- The positions of the hotspots on show (not of the apiaries) are sent from the browser to Mapbox for the land-cover lookup
- Open-Meteo elevation data is useful for broad terrain structure, not fine-grained local verification
- Wild colonies and the Power User all-apiaries layer are not counted as nearby colonies, and neither are the beekeeper's own unselected apiaries
- Aspect, wind shelter, nearby colonies and land cover have not been checked against known DCAs: no confirmed sighting existed in the database when they were added, so their weights are deliberately small. Review them once a few real DCAs are recorded
- The wind direction is a fixed south-westerly, not measured per site. An apiary outside Ireland and Britain, or a valley that funnels wind differently, is not allowed for
- Field checks still matter; the map output is a planning aid, not proof of a true DCA
