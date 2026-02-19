# Add Elevation (Height Above Sea Level) to Apiary Details

## Overview
Add an `elevation` field to apiaries that automatically looks up the height above sea level when coordinates (latitude/longitude) are available. Display this on the apiary detail page.

## API Choice
**Open-Meteo Elevation API** — Free, no API key required, simple REST endpoint.
- Endpoint: `https://api.open-meteo.com/v1/elevation?latitude=XX&longitude=YY`
- Returns elevation in metres above sea level
- No rate limit concerns for our use case

## Todo

### 1. Database Migration
- [x] Add `elevation` column (numeric, nullable) to the `apiaries` table

### 2. TypeScript Types
- [x] Add `elevation` field to the `Apiary` and `ApiaryFormData` interfaces in `src/types/apiary.ts`

### 3. Elevation Lookup Utility
- [x] Create a small helper function to fetch elevation from Open-Meteo API given lat/lng
- [x] Add it to `src/lib/elevation.ts`

### 4. Apiary Form Integration
- [x] When coordinates are set (via geocoding or map picker), auto-fetch elevation
- [x] Save elevation to the database when creating/editing an apiary
- [x] Show elevation in the form as a read-only field (auto-populated)
- [x] Populate elevation when editing an existing apiary

### 5. Apiary Detail Page
- [x] Display elevation on the apiary detail page alongside coordinates

### 6. Backfill Existing Apiaries (Optional)
- [ ] Consider a one-time backfill for existing apiaries that have coordinates but no elevation (can be done by editing and saving each apiary, which will trigger the lookup)

### 7. Documentation
- [x] Create `docs/features/apiary-elevation.md`

## Review

### Summary of Changes

| # | File | Change |
|---|------|--------|
| 1 | DB migration | Added `elevation` (numeric, nullable) column to `apiaries` table |
| 2 | `src/types/apiary.ts` | Added `elevation` field to `Apiary` and `ApiaryFormData` interfaces |
| 3 | `src/lib/elevation.ts` | **New file** — `fetchElevation(lat, lng)` utility using Open-Meteo API |
| 4 | `src/app/dashboard/apiaries/page.tsx` | Imported elevation util; auto-fetches elevation on geocode/map pick; saves to DB; shows read-only field in form; populates on edit; resets on form clear |
| 5 | `src/app/dashboard/apiaries/[id]/page.tsx` | Shows elevation below coordinates (e.g. "42 m above sea level") |
| 6 | `docs/features/apiary-elevation.md` | **New file** — Feature documentation |

### How It Works
- Elevation is fetched automatically whenever coordinates are set (geocoding, map picker)
- The value is stored as a rounded integer in metres
- Displayed as a read-only field in the form and on the detail page
- Existing apiaries will get elevation populated when next edited and saved

### What's Not Included
- No backfill script for existing apiaries (can be done manually by editing/saving each one)
- No manual elevation input (always auto-populated from coordinates)
