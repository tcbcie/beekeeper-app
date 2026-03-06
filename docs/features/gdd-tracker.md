# GDD Tracker Tool

## Summary

The GDD Tracker is a tool within the Tools section that allows beekeepers to record vegetation bloom observations and automatically calculate Growing Degree Days (GDD) from 1 January to the observed bloom date.

## Files

- `src/components/tools/GDDTracker.tsx` - Main tracker component (add, edit, delete, group, and calculate records)
- `src/app/dashboard/tools/page.tsx` - Tools hub page (loads GDD Tracker via `?section=gdd`)

## Features

### Record Management
- Add, edit, and delete GDD bloom observation records
- Select apiary (must have GPS coordinates) and vegetation type
- Enter bloom observed date and optional bloom end date
- Store optional notes
- Share data with nearby beekeepers in anonymised form within 20km
- Auto-calculate GDD from Open-Meteo weather data when a record is saved

### Table View
- Sort by Year, Bloom Date, or GDD
- Open the Vegetation Info Modal from vegetation names
- Edit, delete, recalculate, and toggle sharing inline
- Show a `Calculate` action when a record has no stored GDD value

### Group by Vegetation
- Toggle grouping from the tracker header
- Show a vegetation group header with record count
- Keep the active record sort order inside each group
- Open the Vegetation Info Modal from the group header

## GDD Calculation

### Formula

```text
GDD = sum(max(0, (Tmax + Tmin) / 2) * multiplier)
```

### Seasonal Multipliers

| Month | Multiplier |
| --- | --- |
| January | 0.5 |
| February | 0.75 |
| March to December | 1.0 |

### Data Source

- Open-Meteo Archive API for daily maximum and minimum temperatures
- Timezone: `Europe/Dublin`
- Range: 1 January of the bloom year through the observed bloom date

## Historical Data Note

- On 6 March 2026, the stored `Dandelion` records for `2025-04-01` were corrected from `160.3` to `498.9`.
- Root cause: those rows had retained the older pre-22 January 2026 GDD formula while the rest of the 2025 records had already been recalculated with the current seasonal-multiplier formula.

## Database

### Table: `gdd_records`

| Column | Type | Description |
| --- | --- | --- |
| id | uuid | Primary key |
| user_id | uuid | Owner (RLS filtered) |
| apiary_id | uuid | Foreign key to `apiaries` |
| vegetation_type_id | uuid | Foreign key to `dropdown_values` |
| year | integer | Observation year |
| start_date | date | Bloom observed date |
| end_date | date | Bloom end date (optional) |
| gdd_value | numeric | Calculated GDD |
| is_shared | boolean | Community sharing flag |
| notes | text | Optional notes |
| updated_at | timestamptz | Last update timestamp |

### Unique Constraint

One record per `(user_id, apiary_id, vegetation_type_id, year)`.
