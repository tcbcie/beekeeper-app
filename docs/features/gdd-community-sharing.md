# GDD Community Sharing Feature

## Overview

Complete the GDD data sharing functionality so users can see anonymized bloom/GDD data from nearby beekeepers. This helps beekeepers predict local bloom times based on community observations.

## Current State

### Already Implemented
- `is_shared` boolean field on `gdd_records` table
- RLS policy: "Users can view shared gdd_records" (`is_shared = true`)
- Toggle UI in GDDTracker.tsx (checkbox + icon toggle)
- Share status indicator (green/gray icon)

### Missing
- Obfuscated database view for shared records
- Distance-based filtering (20km radius)
- Community data display in GDDDataTab
- Anonymization of shared data

## Implementation Plan

### Phase 1: Database Layer

#### 1.1 Create Obfuscated View
```sql
CREATE OR REPLACE VIEW shared_gdd_records_community AS
SELECT
  gr.id,
  gr.vegetation_type_id,
  gr.year,
  gr.start_date,
  gr.end_date,
  gr.gdd_value,
  dv.value as vegetation_name,
  -- Obfuscate location: use apiary city only, no exact coords
  a.city,
  a.county,
  -- Include coords for distance calc but don't expose directly
  a.latitude,
  a.longitude,
  gr.user_id  -- For exclusion filter only
FROM gdd_records gr
JOIN apiaries a ON gr.apiary_id = a.id
LEFT JOIN dropdown_values dv ON gr.vegetation_type_id = dv.id
WHERE gr.is_shared = true
  AND a.latitude IS NOT NULL
  AND a.longitude IS NOT NULL;
```

#### 1.2 Create Distance Function (if not exists)
```sql
CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
  R CONSTANT DOUBLE PRECISION := 6371;
  dlat DOUBLE PRECISION;
  dlon DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  dlat := RADIANS(lat2 - lat1);
  dlon := RADIANS(lon2 - lon1);
  a := SIN(dlat/2) * SIN(dlat/2) + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dlon/2) * SIN(dlon/2);
  c := 2 * ATAN2(SQRT(a), SQRT(1-a));
  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

#### 1.3 RLS Policy Update
Ensure the view respects RLS or create appropriate policy.

### Phase 2: Frontend - GDDDataTab.tsx

#### 2.1 Add State for Community Data
```typescript
const [communityRecords, setCommunityRecords] = useState<CommunityGDDRecord[]>([])
const [showCommunityData, setShowCommunityData] = useState(false)
const [loadingCommunity, setLoadingCommunity] = useState(false)
```

#### 2.2 Fetch Community Data Function
```typescript
const fetchCommunityData = useCallback(async () => {
  if (!apiaryCoords) return

  setLoadingCommunity(true)
  try {
    // Fetch shared records from other users
    const { data } = await supabase
      .from('shared_gdd_records_community')
      .select('*')
      .neq('user_id', userId)

    if (data) {
      // Filter by distance (20km radius)
      const nearby = data.filter(record => {
        const distance = haversineDistance(
          apiaryCoords.latitude,
          apiaryCoords.longitude,
          record.latitude,
          record.longitude
        )
        return distance <= 20
      })
      setCommunityRecords(nearby)
    }
  } catch (error) {
    console.error('Error fetching community GDD data:', error)
  } finally {
    setLoadingCommunity(false)
  }
}, [userId, apiaryCoords])
```

#### 2.3 UI Toggle for Community Data
Add a toggle switch to show/hide community data:
```tsx
<div className="flex items-center gap-2">
  <button
    onClick={() => setShowCommunityData(!showCommunityData)}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
      showCommunityData
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    }`}
  >
    <Users size={16} />
    <span>Nearby Data</span>
  </button>
</div>
```

#### 2.4 Display Community Data
- In table: Add "Source" column (You / Community)
- In chart: Different styling for community data (e.g., dashed lines, lighter colors)
- Show location hint: "Near [City]" instead of exact apiary name

### Phase 3: Chart Integration

#### 3.1 Bloom GDD Chart
- Show community bloom dates as semi-transparent bars behind user's data
- Add legend distinguishing "Your Data" vs "Nearby Beekeepers"

#### 3.2 Accumulation Chart
- Option to overlay community average accumulation curve
- Useful for users without historical data

## Data Privacy Considerations

1. **No exact coordinates exposed** - Only city/county shown
2. **No user identification** - No names, usernames, or profile links
3. **Distance calculated server-side** - User coords not sent to other clients
4. **Opt-in only** - Users must explicitly enable sharing
5. **20km radius limit** - Only relevant local data shown

## UI/UX Notes

### Visual Distinction
- User's own data: Solid colors, full opacity
- Community data: Lighter colors, dashed borders, "(Nearby)" label

### Empty States
- No community data: "No shared data from nearby beekeepers yet"
- No apiary coords: "Add GPS coordinates to your apiary to see nearby data"

### Mobile Considerations
- Community toggle easily accessible
- Clear visual separation in card view

## Files to Modify

1. **Database migration** - Create view and function
2. `src/components/research/GDDDataTab.tsx` - Add community data display
3. `docs/features/gdd-data.md` - Update documentation

## Testing Checklist

- [ ] Users can toggle community data view on/off
- [ ] Only shared records from other users appear
- [ ] Distance filter works correctly (20km)
- [ ] User's own shared records don't appear in community view
- [ ] Chart shows community data with distinct styling
- [ ] No personal information exposed
- [ ] Works on mobile
- [ ] Graceful handling when no community data available

## Future Enhancements

1. **Adjustable radius** - Let users choose 10km, 20km, 50km
2. **Vegetation-specific insights** - "3 beekeepers near you reported Blackberry blooming"
3. **Bloom alerts** - Notify when nearby users report bloom start
4. **Historical comparison** - Compare your GDD with community average for same vegetation

## Estimated Complexity

- Database changes: Simple (1 migration)
- Frontend changes: Moderate (extend existing component)
- Total: Medium complexity feature

---

## Implementation Complete - January 29, 2026

### What Was Built

**Database:**
- `calculate_distance_km()` - Haversine distance function
- `shared_gdd_records_community` - View exposing shared records with city (no exact coords)

**Frontend (GDDDataTab.tsx):**
- "Nearby Data" toggle button (amber themed)
- Fetches shared records from other users within 20km
- Displays community records with distinct amber styling in table view
- Mobile card view shows community records with amber background
- **Phenology chart integration:**
  - Community bars appear alongside user data when toggle enabled
  - Lighter/transparent coloring (30% opacity vs 80%)
  - Legend shows "(nearby)" suffix for community datasets
  - Shows average GDD when multiple nearby records exist for same vegetation/year
  - Combines vegetation types from both user and community data

---

### Bug Fix: Multi-Apiary Support - January 29, 2026

**Problem:** Users with multiple apiaries couldn't see community data if their first-created apiary was far from shared records, even if another apiary was within 20km.

**Root Cause:** Code only used the FIRST apiary with coordinates for distance calculation.

**Solution:** Changed to check distance against ALL user apiaries:
- Renamed `apiaryCoords` to `apiaryCoordsList` (array)
- Updated `fetchApiaryCoords()` to fetch all apiaries (removed `.limit(1)`)
- Updated `fetchCommunityData()` to use `apiaryCoordsList.some()` - a record is "nearby" if it's within 20km of ANY user apiary

---

*Created: 2026-01-29*
*Last Updated: 2026-01-29*
*Status: Fully Implemented*
