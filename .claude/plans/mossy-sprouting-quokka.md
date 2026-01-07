# Wolf Waagen Hive Scale Integration

## Overview
Integrate Wolf Waagen hive scales (ApiGraph 4.0) to allow users to connect their scales and display sensor data (weight, temperature, humidity, etc.) on hive detail pages. This follows the same architectural patterns as the existing BEEP integration.

## Wolf Waagen API Reference

**Base URL**: `https://new.app.wolf-waagen.de/api/v1`

**Authentication**: Bearer token in Authorization header
```
Authorization: Bearer <api_token>
```

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

**Time Resolution Options**: `hourly`, `daily` (assumed)

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
// Types
export interface WolfScale {
  scale: string           // Scale ID (e.g., "XVF25AA")
  serial_number: string
  hardware_key: string
  latest_transmission_timestamp: string | null
}

export interface WolfSensorReading {
  time: string
  weight?: string        // "23.550 [kg]" - needs parsing
  yield?: string         // Daily change
  temperature?: string   // "10.0 [°C]"
  brood?: string         // Brood temperature
  humidity?: string      // "50.0 [%]"
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
function parseValueWithUnit(value: string | undefined): number | undefined {
  if (!value) return undefined
  const match = value.match(/^([\d.-]+)/)
  return match ? parseFloat(match[1]) : undefined
}

// Functions
export async function wolfGetScales(apiToken: string): Promise<WolfScale[]>
export async function wolfGetMeasurements(
  apiToken: string,
  scaleId: string,
  startTimestamp: number,
  endTimestamp: number,
  resolution: 'hourly' | 'daily' = 'hourly'
): Promise<WolfParsedReading[]>
```

**Key Difference from BEEP**:
- No login endpoint - user provides API token directly
- No "last values" endpoint - use export with recent time range
- Values returned as strings with units - need parsing

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
// 2. Test token by calling wolfGetScales()
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

#### 3.3 Devices Route
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
// 1. Verify auth and access (same pattern as BEEP)
// 2. Get wolf_api_token (from owner if shared hive)
// 3. Calculate time range
// 4. Call wolfGetMeasurements()
// 5. Return { lastValues, history }
```

---

### Phase 4: UI Components

#### 4.1 Scale Sensor Display
**File**: `src/components/hive/WolfSensorDisplay.tsx` (NEW)

Displays real-time Wolf Waagen sensor data:
- Weight (kg) - amber
- Temperature (°C) - blue
- Brood Temperature (°C) - orange
- Humidity (%) - cyan
- Yield/Daily Change (kg) - green/red

**Note**: Wolf doesn't have battery voltage - omit that metric

#### 4.2 Scale History Chart
**File**: `src/components/hive/WolfHistoryChart.tsx` (NEW)

Reuse same pattern as `ScaleHistoryChart.tsx`:
- Line chart with Chart.js
- Period selector (Hour, Day, Week, Month, Year, Custom)
- Dual Y-axis (Weight + Temperature)
- Dark mode support

**Or**: Consider making a generic `ScaleHistoryChart` component that works with both BEEP and Wolf data formats.

#### 4.3 Scale Selection Modal
**File**: `src/components/hive/WolfScaleSelectionModal.tsx` (NEW)

Modal for selecting Wolf Waagen scale:
- List available scales from API
- Show serial number and last transmission time
- Show current assignment status
- Allow reassignment

---

### Phase 5: Profile Page Integration

**File**: `src/app/dashboard/profile/page.tsx`

Add Wolf Waagen section (similar to BEEP section):

```tsx
{/* Wolf Waagen Integration */}
<div className="card">
  <h3>Wolf Waagen Scale</h3>
  {wolfConnected ? (
    <>
      <p>Connected • {wolfDeviceCount} scale(s)</p>
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
      <button type="submit">Connect</button>
    </form>
  )}
</div>
```

**Key Difference**: User enters API token directly (not email/password)

---

### Phase 6: Hive Detail Page Integration

**File**: `src/app/dashboard/hives/[id]/page.tsx`

Update scale section to support both BEEP and Wolf Waagen:

```tsx
{/* Scale Data Section */}
{/* Show BEEP if connected */}
{hive.beep_device_id && (
  <>
    <ScaleSensorDisplay deviceId={hive.beep_device_id} hiveId={hiveId} />
    <ScaleHistoryChart deviceId={hive.beep_device_id} hiveId={hiveId} />
  </>
)}

{/* Show Wolf if connected */}
{hive.wolf_scale_id && (
  <>
    <WolfSensorDisplay scaleId={hive.wolf_scale_id} hiveId={hiveId} />
    <WolfHistoryChart scaleId={hive.wolf_scale_id} hiveId={hiveId} />
  </>
)}

{/* Show connect options if owner and neither connected */}
{isOwner && !hive.beep_device_id && !hive.wolf_scale_id && (
  <div>
    {beepConnected && <button>Connect BEEP Scale</button>}
    {wolfConnected && <button>Connect Wolf Scale</button>}
  </div>
)}
```

---

### Phase 7: Hives List Page

**File**: `src/app/dashboard/hives/page.tsx`

Add Wolf scale icon to hive cards (like BEEP):

```tsx
{hive.wolf_scale_id && (
  <span title="Wolf Waagen scale connected">
    <Scale size={18} className="text-blue-600" />
  </span>
)}
```

Use different color (blue) to distinguish from BEEP (amber).

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| Database migration | NEW | Add wolf columns to profiles and hives |
| `src/lib/wolf-waagen-api.ts` | NEW | API client library |
| `src/app/api/wolf-waagen/connect/route.ts` | NEW | Connect endpoint |
| `src/app/api/wolf-waagen/disconnect/route.ts` | NEW | Disconnect endpoint |
| `src/app/api/wolf-waagen/scales/route.ts` | NEW | List scales endpoint |
| `src/app/api/wolf-waagen/data/route.ts` | NEW | Sensor data endpoint |
| `src/components/hive/WolfSensorDisplay.tsx` | NEW | Real-time display |
| `src/components/hive/WolfHistoryChart.tsx` | NEW | Historical chart |
| `src/components/hive/WolfScaleSelectionModal.tsx` | NEW | Scale picker modal |
| `src/app/dashboard/profile/page.tsx` | MODIFY | Add Wolf connection UI |
| `src/app/dashboard/hives/[id]/page.tsx` | MODIFY | Add Wolf scale section |
| `src/app/dashboard/hives/page.tsx` | MODIFY | Add Wolf scale icon |
| `src/types/hive.ts` | MODIFY | Add Wolf fields to interface |

---

## Key Differences from BEEP Integration

| Aspect | BEEP | Wolf Waagen |
|--------|------|-------------|
| Auth method | Email/password → token | Direct API token |
| Login endpoint | Yes (`/api/login`) | No |
| Last values endpoint | Yes (`/sensors/lastvalues`) | No - use export |
| Data format | Numeric values | Strings with units |
| Device identifier | Numeric ID | String code (e.g., "XVF25AA") |
| Additional sensors | Audio frequencies, bee count | Rain, wind, brood temp |
| Battery status | Yes | No |

---

## Data Parsing Strategy

Wolf Waagen returns values as strings like `"23.550 [kg]"`. Create parsing utility:

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
- All Wolf API calls go through server-side proxy
- Token never exposed to client-side JavaScript
- Auth verification on all API endpoints
- Same shared hive access control as BEEP

---

## Implementation Order

1. **Database migration** - Add columns
2. **API client library** - Core Wolf API functions
3. **API routes** - Server-side endpoints
4. **Profile page** - Connection UI
5. **Display components** - Sensor display + chart
6. **Selection modal** - Scale picker
7. **Hive detail integration** - Connect everything
8. **Hives list** - Scale icon indicator
9. **Testing** - All functionality

---

## Estimated Effort

- Phase 1 (Database): 15 min
- Phase 2 (API Client): 30 min
- Phase 3 (API Routes): 1 hour
- Phase 4 (UI Components): 1.5 hours
- Phase 5-7 (Integration): 1 hour
- Testing & Polish: 30 min

**Total: ~5 hours**
