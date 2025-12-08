# GDD (Growing Degree Days) Tracking Feature

## Status: COMPLETED

## Overview
Added a new tool under the Tools section to track Growing Degree Days (GDD) for vegetation blooming periods per apiary.

## Completed Items

- [x] Create database migration for `gdd_records` table
- [x] Add `vegetation_type` dropdown category with 16 vegetation types
- [x] Create GDDTracker component with full CRUD functionality
- [x] Add GDD tool to Tools page
- [x] Implement GDD calculation using Open-Meteo historical weather API
- [x] Add sharing toggle with privacy hint
- [x] Add gdd_records to user data exports (JSON & CSV)
- [x] Add gdd_records to admin export fallback list
- [x] Add gdd_records to settings page export list

## Review Section

### Files Created
- `src/components/tools/GDDTracker.tsx` - Main GDD tracking component

### Files Modified
- `src/app/dashboard/tools/page.tsx` - Added GDD Tracking tool card
- `src/app/dashboard/profile/page.tsx` - Added gdd_records to JSON & CSV exports
- `src/app/api/admin/export-all-data/route.ts` - Added gdd_records to fallback table list
- `src/app/dashboard/settings/page.tsx` - Added gdd_records to SQL export list

### Database Changes
1. Created `gdd_records` table with:
   - Foreign keys to apiaries and dropdown_values
   - RLS policies for user access and shared data viewing
   - Unique constraint per apiary/vegetation/year

2. Added `vegetation_type` dropdown category with 16 initial values:
   - Oil Seed Rape (Canola), Clover (White/Red), Hawthorn, Blackberry
   - Heather, Ivy, Dandelion, Apple Blossom, Cherry Blossom
   - Lime (Linden), Willow, Sycamore, Horse Chestnut, Field Bean, Borage

### Features Implemented
1. **Add GDD Record Form**
   - Apiary selector (only shows apiaries with eircode)
   - Vegetation type dropdown (from dropdown_values)
   - Start/End date pickers
   - Notes field
   - Sharing toggle with privacy hint

2. **GDD Calculation**
   - Uses Open-Meteo Archive API for historical weather data
   - Base temperature: 10°C
   - Formula: GDD = sum(max(0, (Tmax + Tmin) / 2 - 10))
   - Triggered when end date is set

3. **Records Table**
   - Shows year, apiary, vegetation, dates, GDD value
   - Share toggle per record
   - Delete functionality
   - "Calculate" button for records without GDD value

4. **Data Sharing**
   - Per-record sharing toggle
   - Privacy hint: "Data will be anonymized and only shown to users within 20km"
   - RLS policy allows viewing shared records

### Build Verification
```
✓ Compiled successfully in 30.6s
✓ Linting and checking validity of types
✓ Generating static pages (30/30)
```

### Future Enhancements (Not in Scope)
- Historical comparison columns (last year, 5-year average)
- Nearby users' shared data display (requires geocoding/distance calculation)
- These can be added in a future iteration
