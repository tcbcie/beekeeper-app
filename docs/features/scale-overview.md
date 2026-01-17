# Scale Overview Feature

## Summary

Add a new "Scale Overview" tab to the Research section that displays all hives with connected scales (BEEP and Wolf Waagen) on a single page for easy comparison.

## Files to Create

### 1. `src/components/research/ScaleOverviewTab.tsx`
New tab component following existing pattern from WildColoniesTab/DiagnosisImagesTab.

**Key features:**
- Fetches all hives with scales (where `beep_device_id` or `wolf_scale_id` is not null)
- Displays summary stats (total hives with scales, BEEP count, Wolf count)
- Renders responsive grid of HiveScaleCard components
- Empty state when no scales found
- Global refresh button

### 2. `src/components/research/HiveScaleCard.tsx`
Compact card component for displaying a single hive's scale data.

**Key features:**
- Self-contained data fetching using existing API routes (`/api/beep/data` or `/api/wolf-waagen/data`)
- Shows: hive name, apiary, current weight, weight changes (24h/7d/30d), temperature, humidity, battery
- Color coding: amber border for BEEP, blue for Wolf Waagen
- Loading skeleton, error state with retry
- Auto-refresh every 5 minutes (matching existing components)
- Optional click-through to hive detail page

## Files to Modify

### `src/app/dashboard/research/page.tsx`

**Changes:**
1. Import `ScaleOverviewTab` and `Scale` icon from lucide-react
2. Update `ResearchSection` type to include `'scale-overview'`
3. Add new tab to `sections` array
4. Add conditional render for the new tab

## UI Design

### HiveScaleCard Layout (compact)
```
+------------------------------------------+
| [Scale] Hive #1        [Refresh] [Link]  |
| Home Yard Apiary                         |
+------------------------------------------+
| 45.2 kg | +0.5kg 24h | +2.1kg 7d        |
+------------------------------------------+
| 34.5°C | 60% | Battery: 85%             |
+------------------------------------------+
```

### Responsive Grid
- Mobile: 1 column
- Tablet (md): 2 columns
- Desktop (lg): 3 columns

### Color Scheme
- BEEP scales: amber borders/accents
- Wolf scales: blue borders/accents
- Weight gain: green
- Weight loss: red

## Data Fetching

### Query for hives with scales:
```typescript
const { data: hives } = await supabase
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

## Implementation Steps

1. **Create HiveScaleCard component** - Compact card with self-contained data fetching
2. **Create ScaleOverviewTab component** - Tab wrapper with hive query and grid layout
3. **Update Research page** - Add imports, type, section entry, and conditional render

## Verification

1. Navigate to Research section
2. Verify "Scale Overview" tab appears
3. Click tab and verify hives with scales are displayed
4. Verify BEEP hives show amber styling
5. Verify Wolf hives show blue styling
6. Test refresh button functionality
7. Verify mobile responsiveness
8. Verify dark mode support
9. Test empty state (if applicable)

---

## Implementation Status: COMPLETE

### Files Created
- `src/components/research/HiveScaleCard.tsx` - Compact card component with self-contained data fetching
- `src/components/research/ScaleOverviewTab.tsx` - Tab wrapper with hive query and grid layout

### Files Modified
- `src/app/dashboard/research/page.tsx` - Added Scale import, ScaleOverviewTab import, updated type, sections array, and conditional render

### Implementation Summary
- Created HiveScaleCard that fetches data from existing BEEP/Wolf APIs
- Created ScaleOverviewTab that queries hives with scales and displays them in a responsive grid
- Added new tab to Research page with proper routing support
- Supports both BEEP (amber styling) and Wolf Waagen (blue styling) scales
- Features: loading states, error handling with retry, auto-refresh every 5 minutes, link to hive detail page
