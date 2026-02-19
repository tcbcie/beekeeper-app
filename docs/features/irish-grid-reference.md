# Irish Grid Reference (10km Square)

## Overview

Each apiary with coordinates on the island of Ireland automatically receives an Irish National Grid 10km square reference (e.g. "N16"). This lets beekeepers cross-reference their locations with biodiversity datasets on sites like biodiversityireland.ie, which use the same grid system.

## How It Works

1. **Coordinate projection** — The apiary's WGS84 lat/lng is projected to the Irish National Grid (EPSG:29903) using the `proj4` library.
2. **Grid letter** — The 500km × 500km grid is divided into 25 lettered 100km squares (A–Z, no I). The letter is derived from the easting/northing position.
3. **10km digits** — Two digits identify the 10km square within the 100km letter square.
4. **Result** — A compact 3-character reference like "N16", or `null` for locations outside Ireland.

## Database

- Column: `apiaries.grid_reference` (text, nullable)
- Added via migration `add_grid_reference_to_apiaries`

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/irish-grid.ts` | `toIrishGridRef(lat, lng)` — pure synchronous conversion |
| `src/types/apiary.ts` | `grid_reference` field on `Apiary` and `ApiaryFormData` |
| `src/app/dashboard/apiaries/page.tsx` | Lookup on coordinate change, backfill on load, save to DB, read-only form field |
| `src/app/dashboard/apiaries/[id]/page.tsx` | Display in Location section |

## Behaviour

- **Auto-computed** when coordinates are set via geocoding or map picker
- **Auto-backfilled** on page load for existing apiaries that have coordinates but no grid reference
- **Read-only** — users cannot manually edit the value
- **Null for non-Irish locations** — UK mainland and other locations outside the Irish Grid bounds show nothing

## Dependencies

- `proj4` — coordinate projection library
- `@types/proj4` — TypeScript definitions
