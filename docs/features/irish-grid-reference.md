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

### Why "Get Coordinates" failed — and what geocoding can/cannot do (added later)

`H91ADP9` was investigated directly against the geocoders. The findings contradicted the initial
assumption that Eircode formatting was at fault:

- **Google resolves it correctly**, in every form tried — `H91ADP9`, `H91 ADP9`, and with the country
  appended — returning *Spiddle West, Co. Galway, H91 ADP9* at `53.2566925, -9.2993932`
  (`partial_match: false`). Formatting was **not** the problem.
- **Nominatim must never be used for Eircodes.** Queried with `H91 ADP9, Ireland` it confidently
  returns the **National Gallery of Ireland, Dublin** — about 200 km from the real location. The
  existing code deliberately restricts the Nominatim fallback to *city* lookups for Ireland, and that
  restriction is load-bearing: a wrong coordinate silently corrupts elevation, the Irish Grid square
  and inspection weather. Failing is better than guessing.

The key **is** configured in Vercel (all environments), and Google's endpoint returns
`access-control-allow-origin: *`, so neither a missing key nor CORS explains it. Tested with a
deployed-domain `Origin`/`Referer`, the local key still resolves the Eircode correctly.

That leaves the deployed key itself. The most likely cause is a documented restriction: **the
Geocoding web service rejects API keys carrying HTTP-referrer restrictions** —
*"API keys with referer restrictions cannot be used with this API"* — which is precisely how a
browser-exposed `NEXT_PUBLIC_` key would normally be locked down.

**Fix: geocoding moved server-side** (`src/app/api/geocode/route.ts`). The browser no longer calls
Google at all; it calls our own authenticated route, which:

- sidesteps referrer restrictions entirely (a server key can be unrestricted or IP-restricted);
- keeps the key out of the client bundle, where it was previously readable by anyone;
- prefers a server-only `GOOGLE_MAPS_API_KEY`, falling back to the existing
  `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` so no new configuration is required to keep working;
- requires an authenticated Supabase user, since it spends a metered quota;
- returns Google's own `error_message`, which the UI now shows — so the next failure states the
  actual cause rather than a generic "could not find".

So `geocodeAddress` now returns *why* it failed rather than a bare `null`, and the message reflects it:

| Reason | Message |
| --- | --- |
| `not-configured` (no API key, Irish Eircode only) | "Eircode lookup is not available on this deployment." |
| `denied` (`REQUEST_DENIED` / `OVER_QUERY_LIMIT`) | "The coordinate lookup service refused the request (API key or quota)." |
| `not-found` (`ZERO_RESULTS` or nothing to try) | "Could not find coordinates for that Eircode." |

Every case now also opens the map picker. **If the message says "not available on this deployment"
or mentions the API key, the fix is in Vercel's environment variables, not in the app.**

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

### One prompt, not two (added later)

Saving previously produced **two consecutive dialogs** when an apiary had neither a postcode nor
coordinates: a native `confirm()` about weather, then the location dialog. They are now merged into
a single confirmation that lists only what is actually missing:

- **No coordinates** → elevation and Irish Grid stay blank (plus the NIHBS note for a mating site).
- **No Eircode** → weather is not recorded automatically on inspections.

The actions adapt to the situation: where the position is unknown the dialog offers **"Set on map"**
(cancels the save and opens the picker) against **"Save without a location"**; where only the postcode
is missing there is nothing to pin, so it is a plain **"Go back" / "Save anyway"**. Eircode *format*
validation is unchanged and still rejects a malformed postcode outright — only the *missing*-postcode
case was folded in.

Weather genuinely depends on the Eircode: `records/page.tsx` selects only `eircode, is_uk_ni` for the
apiary and skips the weather fetch when it is absent — the apiary's own coordinates are never used.

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
