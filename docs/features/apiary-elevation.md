# Apiary Elevation (Height Above Sea Level)

## Overview
Each apiary can store its elevation (height above sea level in metres). The value is automatically looked up from GPS coordinates using the Open-Meteo Elevation API.

## How It Works

### Automatic Lookup
When coordinates are set for an apiary — via geocoding from an Eircode/postcode, the map picker, or the "Get Coordinates" button — the app automatically fetches the elevation from the **Open-Meteo Elevation API** and populates a read-only field in the form.

### API Details
- **Endpoint:** `https://api.open-meteo.com/v1/elevation?latitude=XX&longitude=YY`
- **Cost:** Free, no API key required
- **Rate Limits:** None for typical usage
- **Returns:** Elevation in metres above sea level (rounded to nearest metre)

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
- `src/lib/elevation.ts` — New utility: `fetchElevation(lat, lng)` → `number | null`
- `src/app/dashboard/apiaries/page.tsx` — Form integration (auto-fetch, save, display)
- `src/app/dashboard/apiaries/[id]/page.tsx` — Detail page display

### Migration
- `add_elevation_to_apiaries` — `ALTER TABLE apiaries ADD COLUMN elevation numeric NULL`

## Relevance to Beekeeping
Elevation affects local climate, forage availability, and flowering times. Knowing the height above sea level of an apiary helps beekeepers:
- Understand temperature differences between sites (roughly −0.65 °C per 100 m)
- Predict earlier/later nectar flows compared to lower/higher apiaries
- Compare hive performance across different altitudes
