# GDD Data Feature

## Summary

A "GDD Data" tab in the Research section that displays Growing Degree Day records with chart visualization and year-over-year comparison. Features two chart types: Accumulation curves and Bloom GDD comparison.

## Files

### Created
- `src/components/research/GDDDataTab.tsx` - Tab component with chart and table views

### Modified
- `src/app/dashboard/research/page.tsx` - Added new tab to Research section

## Features

### Accumulation Chart (Default)
- **Line chart showing GDD accumulation over 12 months**
- Each year displayed as a separate colored line
- X-axis: Months (Jan-Dec)
- Y-axis: Cumulative GDD from January 1st
- Year selector to choose which years to compare (current + 4 previous)
- Current year line is thicker for emphasis
- Past years truncated to same day-of-year for fair comparison
- Smooth curves with hover tooltips

### Bloom GDD Chart
- Bar chart comparing bloom GDD values by vegetation type
- Different colored bars for each year (green, orange, blue, purple, pink)
- Grouped bars for easy year-over-year comparison
- Data labels showing GDD values on each bar
- **Current GDD reference line** - Red dashed horizontal line showing accumulated GDD from Jan 1 to today

### Table View
- Desktop: Full table with Year, Apiary, Vegetation, Bloom Date, End Date, GDD, Shared columns
- Mobile: Card view with stacked layout

### Filters
- **Year chips**: Multi-select to compare specific years
- **Vegetation dropdown**: Filter by vegetation type
- **Apiary dropdown**: Filter by location
- **Reset button**: Clear all filters

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

This matches the Wolf Waagen GTS (Growing Temperature Sum) calculation method.

## Accumulation Chart

### How It Works
1. Fetches daily temperature data from Open-Meteo Archive API for each selected year
2. Calculates cumulative GDD day-by-day using seasonal multipliers
3. For past years, data is truncated to the current day-of-year for fair comparison
4. Displays as a line chart with months on x-axis

### Year Selection
- Users can select 1-5 years to compare
- Available years: Current year + 4 previous years
- Default selection: Current year + previous year
- Toggle buttons allow adding/removing years

### Data Processing
```typescript
// For each day, add to cumulative GDD if avg temp > 0
const avgTemp = (tMax + tMin) / 2
if (avgTemp > 0) {
  const month = new Date(dateStr).getMonth() + 1
  let multiplier = 1.0
  if (month === 1) multiplier = 0.5
  else if (month === 2) multiplier = 0.75
  cumulativeGDD += avgTemp * multiplier
}
```

### Average Temperature Indicator (Accumulation Chart)
The red `Avg Temp` series in accumulation view is derived and plotted as follows:

1. Daily `temperature_2m_max` and `temperature_2m_min` values are fetched from Open-Meteo for the first apiary coordinates.
2. A daily average is calculated: `(tMax + tMin) / 2`.
3. A monthly average is calculated from all available daily averages in that month, rounded to 1 decimal place.
4. Months with no source days are stored as `null` (not `0`) so future or missing months are not plotted.
5. On the accumulation chart, exactly one temperature point is placed per month at the nearest sampled x-position to mid-month, so points move predictably month-to-month.
6. The series is rendered on the right-hand `y1` axis and tooltip values are displayed in degrees C to 1 decimal place.

---

## Current GDD Reference Line

### Implementation
1. Fetches user's first apiary with GPS coordinates
2. Calls Open-Meteo Archive API for daily temperatures (Jan 1 → today)
3. Calculates accumulated GDD using seasonal multipliers
4. Displays as red dashed horizontal line on chart

### Annotation Config
```typescript
annotation: {
  annotations: {
    currentGDDLine: {
      type: 'line',
      yMin: currentGDD,
      yMax: currentGDD,
      borderColor: 'rgba(239, 68, 68, 0.8)',
      borderWidth: 2,
      borderDash: [6, 6],
      label: {
        display: true,
        content: `Today: ${currentGDD} GDD`,
        position: 'end',
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        color: 'white'
      }
    }
  }
}
```

### Graceful Fallback
- If no apiary has GPS coordinates, the reference line is not shown
- If API call fails, error is logged but chart functions normally

## Dependencies

- `chart.js` - Core charting library
- `react-chartjs-2` - React wrapper
- `chartjs-plugin-datalabels` - Bar value labels
- `chartjs-plugin-annotation` - Reference line annotation

## Data Flow

### GDD Records Query
```typescript
const { data } = await supabase
  .from('gdd_records')
  .select(`
    *,
    apiaries(name),
    dropdown_values(value)
  `)
  .eq('user_id', userId)
  .order('year', { ascending: false })
```

### Current GDD Fetch
```typescript
// Open-Meteo Archive API
const response = await fetch(
  `https://archive-api.open-meteo.com/v1/archive?` +
  `latitude=${lat}&longitude=${lon}&` +
  `start_date=${janFirst}&end_date=${today}&` +
  `daily=temperature_2m_max,temperature_2m_min&` +
  `timezone=Europe/Dublin`
)
```

## UI Notes

### Color Scheme
- Year bars: green, orange, blue, purple, pink (cycling)
- Reference line: red dashed
- Shared indicator: green

### Empty States
- No records: Shows "No GDD records yet" with link to add records
- No filter results: Shows "No records match your filters"

## Access Control

- Available in Research section
- Requires Power User or Admin role
- Records filtered by user_id (RLS)
