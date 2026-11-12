# Community map

**Status:** Complete (reviewed 12/11/2026)

## Overview

The community map (`/dashboard/community-map`) shows a beekeeper their own apiaries alongside what other beekeepers share: the rough position of shared apiaries, NIHBS conservation areas, and likely drone congregation areas (DCAs). It opens on the beekeeper's own apiaries.

## Layers

All layers are switched in the **Layers** panel, opened by the button at the top left of the map. On a phone the panel sits along the bottom of the map and scrolls; on a larger screen it sits at the top left. Each switch shows how many items the layer holds and what its colour means, so the panel doubles as the map key.

| Layer | Who sees it | Position shown | Default |
|-------|-------------|----------------|---------|
| Your apiaries (green) | Everyone | Exact. Includes apiaries shared with you through a team, labelled "Team apiary" | On |
| Shared apiaries (purple) | Everyone | Moved by up to 5 km in the database | On |
| All apiaries (indigo) | Power Users and Admins | Moved by up to 5 km | Off |
| Wild colonies (amber) | Power Users and Admins | Moved by up to 5 km | Off |
| Conservation areas (teal) | Everyone | As declared | Off |
| Drone congregation areas (rose) | Anyone with an apiary on the map | Predicted from terrain; see `dca-prediction.md` | Off |

An apiary that is already on the map as yours or your team's is left out of the shared and all-apiaries layers, so it is not shown twice.

The layer choices, the flight radius and the apiaries ticked for DCA prediction are remembered on the device (`localStorage`, key `community-map-prefs-v1`).

## Other controls

- **Map view** - Map, Satellite or Terrain. Terrain tilts the map so hills and valleys show.
- **Flight radius** - Off, 2, 3 or 5 km circles around your apiaries and shared apiaries.
- **Full screen** - top right. Escape also leaves full screen. Controls keep clear of the phone's status bar.
- **Zoom, compass and "show my position"** - bottom right. The position button asks for the device's location only when tapped.
- **Counts** - top right on larger screens; on a phone they are in the Layers panel.

## Popups

Every marker has a 48px tap area. Popups have a close button, use the popup's own text colour with a coloured dot in the title, and say "About 3 km from your nearest apiary" for other beekeepers' apiaries, because those positions are offset.

## Loading and failures

- The layers load together. A layer that fails is named in a message above the map with a **Try again** button; the others still show.
- If the map itself cannot load (no map key, or the map library failed to download), the frame says so.

## Privacy

- Other beekeepers' apiaries are offset in the database by `get_shared_apiaries_obfuscated()` and returned without owner details. See `community-map-all-apiaries-layer.md`.
- DCA sightings are private to the beekeeper who recorded them.
- Conservation areas are read through `get_conservation_areas()`, which returns no owner or apiary id. An apiary declared as a conservation area is shown at its exact position by design. See `conservation-areas.md` for the policy change still to apply after deployment.
- The tables and helper functions that existed only in the live database are recorded in `sql/community_map_live_definitions.sql`.

## Files

| File | Purpose |
|------|---------|
| `src/app/dashboard/community-map/page.tsx` | The screen: loading, map, layers panel, popups, sighting recording |
| `src/hooks/useDCAPredictions.ts` | DCA predictions, sightings and the prediction cache |
| `src/lib/dca-prediction.ts` | The DCA prediction engine |
| `src/app/globals.css` | `.community-map` rules: 48px map buttons and popup close button |

## Related

- `dca-prediction.md` - the prediction engine and sightings
- `conservation-areas.md` - conservation areas
- `community-map-all-apiaries-layer.md` - the Power User layer and position offsetting
