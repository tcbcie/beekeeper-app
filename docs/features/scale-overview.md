# Scale Overview Feature

## Summary

A "Scale Overview" tab in the Research section that displays all hives with connected scales (BEEP and Wolf Waagen) on a single page for easy comparison.

## Files

### Created
- `src/components/research/ScaleOverviewTab.tsx` - Tab container component
- `src/components/research/HiveScaleCard.tsx` - Individual scale card component

### Modified
- `src/app/dashboard/research/page.tsx` - Added new tab to Research section

## Components

### ScaleOverviewTab
Tab container that:
- Fetches all non-archived hives with connected scales (`beep_device_id` or `wolf_scale_id` not null)
- Displays summary stats (total count, BEEP count, Wolf count)
- Renders responsive grid of HiveScaleCard components
- Provides global "Refresh All" button
- Shows empty state when no scales found

### HiveScaleCard
Compact card component that:
- Self-fetches data from existing API routes (`/api/beep/data` or `/api/wolf-waagen/data`)
- Displays: hive number, scale name, apiary, current weight, weight changes (24h/7d/30d), temperature, humidity, battery
- Color coded: amber border for BEEP, blue for Wolf Waagen
- Auto-refreshes every 5 minutes
- Includes loading skeleton, error state with retry button
- Links to hive detail page

## UI Design

### Card Layout
```
+------------------------------------------------+
| [Scale] Hive #1 (Scale Name)  [BEEP] [↻] [→]   |
| Apiary Name                                    |
+------------------------------------------------+
| 45.2 kg  +0.5kg 24h  +2.1kg 7d  +5.3kg 30d    |
| 34.5°C  60%  Battery: 85%                     |
+------------------------------------------------+
```

### Responsive Grid
- Mobile: 1 column
- Tablet (md): 2 columns
- Desktop (lg): 3 columns

### Color Scheme
- BEEP scales: amber borders/accents (`border-amber-300`)
- Wolf scales: blue borders/accents (`border-blue-300`)
- Weight gain: green text
- Weight loss: red text
- Low battery (<20%): red indicator

### Dark Mode Header Readability
- Hive number text in card headers now uses explicit high-contrast colour pairs by scale type (`amber` for BEEP, `blue` for Wolf).
- Scale name metadata in the header now uses matching secondary colours so labels stay readable without competing with the hive number.
- The same hive-number contrast treatment is applied to both normal and error card headers for consistency.

## Data Flow

### Hive Query (ScaleOverviewTab)
```typescript
const { data } = await supabase
  .from('hives')
  .select(`
    id, hive_number,
    beep_device_id, beep_device_name,
    wolf_scale_id, wolf_scale_name,
    apiaries(id, name)
  `)
  .eq('user_id', userId)
  .is('archived_at', null)
  .or('beep_device_id.not.is.null,wolf_scale_id.not.is.null')
  .order('hive_number')
```

### Scale Data Fetch (HiveScaleCard)
- BEEP: `GET /api/beep/data?deviceId={id}&hiveId={id}`
- Wolf: `GET /api/wolf-waagen/data?scaleId={id}&hiveId={id}`

## Technical Notes

### TypeScript Type Handling
Supabase's auto-generated types can conflict with nested relation queries. The solution uses explicit type casting:
```typescript
setHives(data as unknown as HiveWithScale[])
```

### Null Safety
All data property accesses use explicit null checks for TypeScript compatibility:
```typescript
{data && data.weight !== null && (
  <span>{data.weight.toFixed(1)} kg</span>
)}
```

### Battery Calculation
Both BEEP and Wolf scales convert voltage to percentage:
```typescript
// Voltage range: 2.5V (0%) to 4.2V (100%)
const percent = Math.round(((voltage - 2.5) / 1.7) * 100)
```

### Weight Change Periods
All scales display weight changes for three time periods:
- **24h** - Change over the last 24 hours
- **7d** - Change over the last 7 days
- **30d** - Change over the last 30 days

Both APIs calculate weight changes by comparing the oldest reading in each period to the current weight:

**BEEP API** (`/api/beep/data`):
- Fetches hourly measurements for 24h, 7d, and 30d periods
- Compares oldest weight in each period to current `weight_kg_corrected` or `weight_kg`

**Wolf Waagen API** (`/api/wolf-waagen/data`):
- Fetches hourly measurements for 24h period
- Fetches daily measurements for 7d and 30d periods
- Compares oldest to newest weight in each period

## Access Control

- Feature is available in the Research section
- Research section requires Power User or Admin role
- Scale data respects existing API authorization (owner or team access)

### Feature Toggle

The Scale Overview tab is **hidden** for users who don't have any hives with connected scales. This check runs on page load:

```typescript
const { count } = await supabase
  .from('hives')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', id)
  .is('archived_at', null)
  .or('beep_device_id.not.is.null,wolf_scale_id.not.is.null')

setHasScales((count ?? 0) > 0)
```

The tab only appears in the navigation when `hasScales` is true.
