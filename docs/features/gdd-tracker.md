# GDD Tracker Tool

## Summary

The GDD Tracker is a tool within the Tools section that allows beekeepers to record vegetation bloom observations and automatically calculate Growing Degree Days (GDD) from January 1st to the bloom date.

## Files

- `src/components/tools/GDDTracker.tsx` - Main tracker component (add/edit/delete records, table view)
- `src/app/dashboard/tools/page.tsx` - Tools hub page (loads GDD Tracker via `?section=gdd`)

## Features

### Record Management
- Add, edit, and delete GDD bloom observation records
- Select apiary (must have GPS coordinates) and vegetation type
- Enter bloom start date and optional bloom end date
- Optional notes field
- Community sharing toggle (anonymised, within 20km)
- GDD auto-calculated from Open-Meteo weather API on save

### Table View
- Sortable columns: Year, Bloom Date, GDD (click column header to toggle sort)
- Clickable vegetation names open the Vegetation Info Modal
- Inline actions: edit, delete, toggle sharing
- Records without GDD show a "Calculate" button

### Group by Vegetation
- Toggle button in the header groups records by vegetation type
- Each vegetation group shows a header row with the vegetation name and record count
- Records within each group retain the current sort order
- Group header is clickable to open the Vegetation Info Modal
- Groups are sorted alphabetically by vegetation name
- When grouped, the vegetation column in each row shows plain text (not clickable) since the group header already provides the link

## GDD Calculation

### Formula
```
GDD = Σ max(0, (Tmax + Tmin) / 2) × multiplier
```

### Seasonal Multipliers
| Month | Multiplier |
|-------|------------|
| January | 0.5 |
| February | 0.75 |
| March - December | 1.0 |

### Data Source
- Open-Meteo Archive API: daily max/min temperatures
- Timezone: Europe/Dublin
- Period: January 1st of the bloom year to the bloom observation date

## Database

### Table: `gdd_records`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Owner (RLS filtered) |
| apiary_id | uuid | FK to apiaries |
| vegetation_type_id | uuid | FK to dropdown_values |
| year | integer | Year of observation |
| start_date | date | Bloom start date |
| end_date | date | Bloom end date (optional) |
| gdd_value | numeric | Calculated GDD |
| is_shared | boolean | Community sharing flag |
| notes | text | Optional notes |
| updated_at | timestamptz | Last update |

### Unique Constraint
One record per (user_id, apiary_id, vegetation_type_id, year).
