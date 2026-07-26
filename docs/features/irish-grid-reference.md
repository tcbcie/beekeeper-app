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
- **Auto-resolved on save** when an apiary has no coordinates but does have an Eircode/city: the save
  geocodes first, then derives the grid square and elevation. The page-load backfill only repairs
  rows that *already* have coordinates, so a postcode-only apiary would otherwise never be filled in.
- **Read-only** — users cannot manually edit the value
- **Null for non-Irish locations** — UK mainland and other locations outside the Irish Grid bounds show nothing

### Map pin is the reliable path (added later)

Eircode geocoding proved unreliable in practice — a valid Eircode (`H91ADP9`, a Galway mating site)
could not be resolved to coordinates at all. So the map pin, not the Eircode, is now the prompted
route whenever a save would otherwise store an apiary with no position:

- Saving without resolvable coordinates opens a confirmation offering **"Set on map"** (which cancels
  the save and opens the picker) or **"Save without a location"**. For a mating apiary the message
  names the NIHBS return explicitly.
- The inline warning carries a **"Pick on Map"** button rather than only advising it, and hides itself
  while the picker is open.

The Eircode lookup is still attempted first on save, since it succeeds often enough to be worth it —
it is simply no longer treated as sufficient.

Two ordering/wording details matter here:

- Coordinate resolution runs **before the apiary image is uploaded**. The prompt can abort the save,
  and uploading first would leave an orphaned file in storage on every attempt.
- The prompt distinguishes *"could not be determined from the Eircode"* from *"no coordinates have
  been set"*, since the lookup is skipped entirely when there is no Eircode or city to try.

### Missing-coordinates warning (added later)

The elevation and Irish Grid fields render only when they hold a value, so an apiary with no
coordinates showed neither and gave no clue why. The GPS section now shows an inline amber warning
whenever latitude/longitude are empty, and for an apiary flagged as a **mating location** it states
that both values appear on the **NIHBS return** and would be submitted blank. This was reported as
"elevation and Irish Grid are missing for mating apiaries" — the fields were never gated on
`is_mating_apiary`; the apiary in question simply had an Eircode and no coordinates.

## Dependencies

- `proj4` — coordinate projection library
- `@types/proj4` — TypeScript definitions
