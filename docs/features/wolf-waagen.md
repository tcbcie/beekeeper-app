# Wolf Waagen Hive Scale Integration

## Overview
Integrate Wolf Waagen hive scales (ApiGraph 4.0) to allow users to connect their scales and display sensor data (weight, temperature, humidity, etc.) on hive detail pages.

**Important**: Wolf Waagen is a completely separate scale technology from BEEP. This integration is independent and unrelated to BEEP - they are different products from different manufacturers with different APIs. The implementation follows similar architectural patterns (API client → server routes → UI components) for code consistency, but all code is separate and specific to Wolf Waagen.

---

## Wolf Waagen API Reference

**Manufacturer**: Wolf Waagen (German company)
**Product**: ApiGraph 4.0 / ApiGraph Junior
**Base URL**: `https://new.app.wolf-waagen.de/api/v1`

**Authentication**: Bearer token in Authorization header
```
Authorization: Bearer <api_token>
```
*Note: API token is provided by Wolf Waagen - no login endpoint exists*

### Endpoints

#### 1. List Scales
```
GET /user/scale
```
**Response:**
```json
{
  "success": true,
  "execution_time": "8.91 ms",
  "data": [
    {
      "scale": "XVF25AA",
      "serial_number": "41M012345",
      "hardware_key": "API41",
      "latest_transmission_timestamp": "2024-06-15 13:00:00"
    }
  ]
}
```

#### 2. Export Historical Data
```
POST /user/scale/export
```
**Request Body:**
```json
{
  "scale": "XVF25AA",
  "time_start": 1681502076,
  "time_end": 1681588476,
  "time_resolution": "hourly",
  "format": "json"
}
```
**Response:**
```json
{
  "success": true,
  "execution_time": "8.91 ms",
  "units": ["kg"],
  "data": [
    {
      "time": "2020-01-01T00:00:00+01:00",
      "weight": "23.550 [kg]",
      "yield": "0.050 [kg]",
      "temperature": "10.0 [°C]",
      "brood": "10.0 [°C]",
      "humidity": "50.0 [%]",
      "rain": "0.005 [mm]",
      "wind_speed": "10 [km/h]",
      "wind_direction": "90 [°]"
    }
  ]
}
```

**Time Resolution Options**: `hourly`, `daily`

### Wolf Waagen Sensor Data
- **weight**: Hive weight in kg
- **yield**: Daily weight change in kg
- **temperature**: Ambient temperature in °C
- **brood**: Brood nest temperature in °C
- **humidity**: Relative humidity in %
- **rain**: Precipitation in mm
- **wind_speed**: Wind speed in km/h
- **wind_direction**: Wind direction in degrees

---

## Implementation Plan

### Phase 1: Database Schema

**Migration**: `add_wolf_waagen_integration_columns`

Add columns to `profiles` table:
```sql
ALTER TABLE profiles
ADD COLUMN wolf_api_token TEXT,
ADD COLUMN wolf_connected_at TIMESTAMPTZ;
```

Add columns to `hives` table:
```sql
ALTER TABLE hives
ADD COLUMN wolf_scale_id TEXT,
ADD COLUMN wolf_scale_name TEXT;
```

---

### Phase 2: API Client Library

**File**: `src/lib/wolf-waagen-api.ts` (NEW)

```typescript
const WOLF_API_BASE = 'https://new.app.wolf-waagen.de/api/v1'

// Types
export interface WolfScale {
  scale: string              // Scale ID (e.g., "XVF25AA")
  serial_number: string
  hardware_key: string
  latest_transmission_timestamp: string | null
}

export interface WolfSensorReading {
  time: string
  weight?: string           // "23.550 [kg]" - needs parsing
  yield?: string            // Daily weight change
  temperature?: string      // "10.0 [°C]"
  brood?: string            // Brood temperature
  humidity?: string         // "50.0 [%]"
  rain?: string
  wind_speed?: string
  wind_direction?: string
}

export interface WolfParsedReading {
  time: string
  weight_kg?: number
  yield_kg?: number
  temperature_c?: number
  brood_temp_c?: number
  humidity_percent?: number
  rain_mm?: number
  wind_speed_kmh?: number
  wind_direction_deg?: number
}

// Helper to parse "23.550 [kg]" → 23.550
function parseWolfValue(value: string | undefined): number | undefined

// API Functions
export async function wolfGetScales(apiToken: string): Promise<WolfScale[]>

export async function wolfGetMeasurements(
  apiToken: string,
  scaleId: string,
  startTimestamp: number,
  endTimestamp: number,
  resolution: 'hourly' | 'daily' = 'hourly'
): Promise<WolfParsedReading[]>
```

**Key characteristics**:
- No login endpoint - user provides API token directly
- No "last values" endpoint - use export with recent time range for current data
- Values returned as strings with units - require parsing

---

### Phase 3: API Routes

**Directory**: `src/app/api/wolf-waagen/`

#### 3.1 Connect Route
**File**: `src/app/api/wolf-waagen/connect/route.ts`

```typescript
// POST /api/wolf-waagen/connect
// Body: { apiToken: string }
//
// 1. Verify Supabase auth
// 2. Validate token by calling wolfGetScales()
// 3. Store token in profiles.wolf_api_token
// 4. Store wolf_connected_at timestamp
// 5. Return success with scale count
```

#### 3.2 Disconnect Route
**File**: `src/app/api/wolf-waagen/disconnect/route.ts`

```typescript
// POST /api/wolf-waagen/disconnect
//
// 1. Verify Supabase auth
// 2. Clear wolf_api_token, wolf_connected_at from profiles
// 3. Clear wolf_scale_id, wolf_scale_name from all user's hives
```

#### 3.3 Scales Route
**File**: `src/app/api/wolf-waagen/scales/route.ts`

```typescript
// GET /api/wolf-waagen/scales
//
// 1. Verify Supabase auth
// 2. Get wolf_api_token from profiles
// 3. Call wolfGetScales()
// 4. Enrich with hive assignment info from hives table
// 5. Return scales with assignment status
```

#### 3.4 Data Route
**File**: `src/app/api/wolf-waagen/data/route.ts`

```typescript
// GET /api/wolf-waagen/data?scaleId=X&hiveId=Y&period=day
//
// Query params:
// - scaleId: Wolf scale ID (required)
// - hiveId: HiveCraic hive ID (for shared access)
// - period: 'hour' | 'day' | 'week' | 'month' | 'year' | 'custom'
// - startDate, endDate: For custom period
//
// 1. Verify auth and access
// 2. Get wolf_api_token (from owner if shared hive)
// 3. Calculate time range (Unix timestamps)
// 4. Call wolfGetMeasurements()
// 5. Return { lastValues, history }
```

---

### Phase 4: UI Components

#### 4.1 Scale Sensor Display
**File**: `src/components/hive/WolfSensorDisplay.tsx` (NEW)

Displays real-time Wolf Waagen sensor data:
- Weight (kg) - amber styling
- Temperature (°C) - blue styling
- Brood Temperature (°C) - orange styling
- Humidity (%) - cyan styling
- Yield/Daily Change (kg) - green/red based on +/-

*Note: Wolf Waagen doesn't report battery voltage*

#### 4.2 Scale History Chart
**File**: `src/components/hive/WolfHistoryChart.tsx` (NEW)

Chart.js line chart with:
- Period selector (Hour, Day, Week, Month, Year, Custom)
- Dual Y-axis (Weight + Temperature)
- Dark mode support
- Custom date range picker

#### 4.3 Scale Selection Modal
**File**: `src/components/hive/WolfScaleSelectionModal.tsx` (NEW)

Modal for selecting Wolf Waagen scale:
- List available scales from API
- Show serial number and last transmission time
- Show current assignment status
- Allow reassignment between hives

---

### Phase 5: Profile Page Integration

**File**: `src/app/dashboard/profile/page.tsx`

Add Wolf Waagen section:

```tsx
{/* Wolf Waagen Integration */}
<div className="card">
  <h3>Wolf Waagen Scale</h3>
  {wolfConnected ? (
    <>
      <p>Connected • {wolfScaleCount} scale(s)</p>
      <button onClick={handleWolfDisconnect}>Disconnect</button>
    </>
  ) : (
    <form onSubmit={handleWolfConnect}>
      <input
        type="password"
        placeholder="API Token"
        value={wolfApiToken}
        onChange={(e) => setWolfApiToken(e.target.value)}
      />
      <p className="text-sm text-gray-500">
        Get your API token from Wolf Waagen support
      </p>
      <button type="submit">Connect</button>
    </form>
  )}
</div>
```

*Note: User enters API token directly (not email/password like BEEP)*

---

### Phase 6: Hive Detail Page Integration

**File**: `src/app/dashboard/hives/[id]/page.tsx`

Update scale section to support Wolf Waagen:

```tsx
{/* Wolf Waagen Scale Data */}
{hive.wolf_scale_id && (
  <>
    <WolfSensorDisplay scaleId={hive.wolf_scale_id} hiveId={hiveId} />
    <WolfHistoryChart scaleId={hive.wolf_scale_id} hiveId={hiveId} />
  </>
)}

{/* Connect Wolf Scale button for owners */}
{isOwner && wolfConnected && !hive.wolf_scale_id && (
  <button onClick={() => setShowWolfModal(true)}>
    Connect Wolf Scale
  </button>
)}
```

---

### Phase 7: Hives List Page

**File**: `src/app/dashboard/hives/page.tsx`

Add Wolf scale icon to hive cards:

```tsx
{hive.wolf_scale_id && (
  <span title="Wolf Waagen scale connected">
    <Scale size={18} className="text-blue-600" />
  </span>
)}
```

*Use blue color to visually distinguish from BEEP (amber)*

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| Database migration | NEW | Add wolf columns to profiles and hives |
| `src/lib/wolf-waagen-api.ts` | NEW | Wolf Waagen API client library |
| `src/app/api/wolf-waagen/connect/route.ts` | NEW | Connect endpoint |
| `src/app/api/wolf-waagen/disconnect/route.ts` | NEW | Disconnect endpoint |
| `src/app/api/wolf-waagen/scales/route.ts` | NEW | List scales endpoint |
| `src/app/api/wolf-waagen/data/route.ts` | NEW | Sensor data endpoint |
| `src/components/hive/WolfSensorDisplay.tsx` | NEW | Real-time display component |
| `src/components/hive/WolfHistoryChart.tsx` | NEW | Historical chart component |
| `src/components/hive/WolfScaleSelectionModal.tsx` | NEW | Scale picker modal |
| `src/app/dashboard/profile/page.tsx` | MODIFY | Add Wolf connection UI |
| `src/app/dashboard/hives/[id]/page.tsx` | MODIFY | Add Wolf scale section |
| `src/app/dashboard/hives/page.tsx` | MODIFY | Add Wolf scale icon |
| `src/types/hive.ts` | MODIFY | Add Wolf fields to Hive interface |

---

## Data Parsing Strategy

Wolf Waagen returns values as formatted strings. Parse utility needed:

```typescript
// Parse "23.550 [kg]" → 23.550
// Parse "10.0 [°C]" → 10.0
// Parse "50.0 [%]" → 50.0
function parseWolfValue(value: string | undefined): number | undefined {
  if (!value) return undefined
  const match = value.match(/^([\d.-]+)/)
  return match ? parseFloat(match[1]) : undefined
}
```

---

## Testing Checklist

- [ ] Wolf API token validation on connect
- [ ] Scale list fetches correctly
- [ ] Scale assignment to hive works
- [ ] Real-time data displays properly
- [ ] Historical chart renders with data
- [ ] Time period filters work
- [ ] Custom date range works
- [ ] Shared hive access works for team members
- [ ] Disconnect clears all assignments
- [ ] Error states handled gracefully
- [ ] Loading states display
- [ ] Dark mode styling correct
- [ ] Mobile responsive

---

## Security Considerations

- Wolf API token stored server-side in database (protected by RLS)
- All Wolf API calls go through server-side proxy routes
- Token never exposed to client-side JavaScript
- Auth verification on all API endpoints
- Team access control for shared hives

---

## Implementation Order

1. **Database migration** - Add columns
2. **API client library** - Core Wolf API functions
3. **API routes** - Server-side endpoints
4. **Profile page** - Connection UI
5. **Display components** - Sensor display + chart
6. **Selection modal** - Scale picker
7. **Hive detail integration** - Wire up components
8. **Hives list** - Scale icon indicator
9. **Testing** - Verify all functionality
