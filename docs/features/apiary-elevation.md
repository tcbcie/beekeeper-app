# Apiary Elevation (Height Above Sea Level)

## Overview
Each apiary can store its elevation (height above sea level in metres). The value is automatically looked up from GPS coordinates using the Open-Meteo Elevation API.

## How It Works

### Automatic Lookup
When coordinates are set for an apiary — via geocoding from an Eircode/postcode, the map picker, or the "Get Coordinates" button — the app automatically fetches the elevation from the **Open-Meteo Elevation API** and populates a read-only field in the form.

### API Details (changed 12/11/2026)
The browser no longer calls Open-Meteo for heights. It calls the app's own route, which does the lookup on the server:

- **Route:** `POST /api/elevation` with `{ points: [latitude, longitude][] }` (1 to 1,000 points). Replies `{ elevations: (number | null)[] }` in the same order.
- **Who can call it:** signed-in, active accounts only, up to 300 calls an hour each.
- **Upstream:** `https://api.open-meteo.com/v1/elevation`, 100 points per request, requests run side by side. No API key.
- **Caching:** successful answers are kept on the server for 30 days, since terrain does not change. Coordinates are rounded to five decimal places (about a metre) so the same point finds its cached answer.
- **Privacy:** positions reach Open-Meteo from the server, not from the beekeeper's phone.
- **Swapping the provider:** only `fetchChunk` in the route knows which service is used.
- **Open-Meteo terms:** the free tier has usage limits and is meant for non-commercial use. Check these against how HiveCraic is offered.
- **Returns:** Elevation in metres above sea level (rounded to nearest metre in the apiary form)

The DCA prediction engine uses the same route through `fetchElevationBatch` (see `dca-prediction.md`).

### Where Elevation Is Displayed
1. **Apiary form** — Read-only field below the GPS coordinate inputs, shown when coordinates are present
2. **Apiary detail page** — Below the coordinates in the Location section (e.g. "42 m above sea level")

## Database Schema
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `elevation` | numeric | YES | Height above sea level in metres |

## Technical Details

### Files Modified
- `src/types/apiary.ts` — Added `elevation` field to `Apiary` and `ApiaryFormData` interfaces
- `src/lib/elevation.ts` — Browser helper: `fetchElevation(lat, lng)` and `fetchElevationBatch(points)`, both through `/api/elevation`
- `src/app/api/elevation/route.ts` — The server route: sign-in, rate limit, lookup and caching
- `src/lib/elevation-limits.ts` — The points-per-call limit shared by the route and the helper
- `src/app/dashboard/apiaries/page.tsx` — Form integration (auto-fetch, save, display)
- `src/app/dashboard/apiaries/[id]/page.tsx` — Detail page display

### Migration
- `add_elevation_to_apiaries` — `ALTER TABLE apiaries ADD COLUMN elevation numeric NULL`

## Relevance to Beekeeping
Elevation affects local climate, forage availability, and flowering times. Knowing the height above sea level of an apiary helps beekeepers:
- Understand temperature differences between sites (roughly −0.65 °C per 100 m)
- Predict earlier/later nectar flows compared to lower/higher apiaries
- Compare hive performance across different altitudes
