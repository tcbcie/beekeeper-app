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
  "scales": [
    {
      "scale_id": "R4JLXN",
      "serial_number": "42M03446",
      "hardware_key": "API42",
      "latest_transmission_timestamp": "2026-01-14T14:58:16.000000Z"
    }
  ]
}
```
*Note: Response uses `scales` array (not `data`) and `scale_id` field (not `scale`)*

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
      "time": "2026-02-05T21:00:00+01:00",
      "weight": 47.36,
      "yield": -0.11,
      "temperature": 5.7,
      "brood": 29.6,
      "humidity": 93.8,
      "rain": 0,
      "wind_speed": 15.72,
      "wind_direction": 94
    }
  ]
}
```

**Time Resolution Options**: `hourly`, `daily`

*Note: Contrary to initial API documentation, values are returned as raw numbers (not strings with units). The `parseWolfValue()` helper handles both formats for safety.*

### Data Resolution & Intervals

The Wolf Waagen API provides two resolution options - there is no real-time or minute-level data available.

| Resolution | Interval | Use Case |
|------------|----------|----------|
| `hourly` | 1 reading per hour | Short-term analysis (hour, day, week) |
| `daily` | 1 reading per day | Long-term trends (month, year) |

**Application Usage:**

| View Period | Resolution Used |
|-------------|-----------------|
| Hour | hourly |
| Day | hourly |
| Week | hourly |
| Month | daily |
| Year | daily |
| Last Values | hourly (last 24h, returns most recent) |
| 7-day weight change | daily |
| 30-day weight change | daily |

#### 3. Trachtnet Export (Battery Voltage)
```
POST /user/trachtnet/export
```
**Request Body:**
```json
{
  "scale": "40M12345",
  "format": "json",
  "time_start": "2020-01-01",
  "time_end": "2020-12-31"
}
```
**Response:**
```json
{
  "success": true,
  "execution_time": "8.91 ms",
  "data": [
    {
      "time": "2020-01-01 00:00:00",
      "weight": 110,
      "longitude": 0,
      "latitude": 0,
      "altitude": 0,
      "temperature": 11.4,
      "rain": 10,
      "humidity": 71.1,
      "battery_voltage": 3.9
    }
  ]
}
```

*Note: Trachtnet endpoint uses date strings ("YYYY-MM-DD") instead of Unix timestamps, and returns raw numeric values instead of strings with units.*

### Wolf Waagen Sensor Data
- **weight**: Hive weight in kg
- **yield**: Weight change in kg (hourly or daily depending on `time_resolution`)
- **temperature**: Ambient temperature in °C
- **brood**: Brood nest temperature in °C
- **humidity**: Relative humidity in %
- **rain**: Precipitation in mm
- **wind_speed**: Wind speed in km/h
- **wind_direction**: Wind direction in degrees
- **battery_voltage**: Battery voltage in V (from Trachtnet endpoint)

**Important**: Every reading includes both `weight` and `yield` values. The `yield` represents the weight change since the previous reading (positive = weight gain, negative = weight loss).

---

## Implementation Plan

### Phase 1: Database Schema ✅ COMPLETED

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

### Phase 2: API Client Library ✅ COMPLETED

**File**: `src/lib/wolf-waagen-api.ts`

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
  battery_voltage?: number
}

// Helper to parse "23.550 [kg]" → 23.550
function parseWolfValue(value: string | number | undefined): number | undefined

// API Functions
export async function wolfGetScales(apiToken: string): Promise<WolfScale[]>

export async function wolfGetMeasurements(
  apiToken: string,
  scaleId: string,
  startTimestamp: number,
  endTimestamp: number,
  resolution: 'hourly' | 'daily' = 'hourly'
): Promise<WolfParsedReading[]>

export async function wolfGetBatteryVoltage(
  apiToken: string,
  scaleId: string
): Promise<number | null>
```

**Key characteristics**:
- No login endpoint - user provides API token directly
- No "last values" endpoint - use export with recent time range for current data
- Values returned as strings with units - require parsing
- Battery voltage fetched from separate Trachtnet endpoint

---

### Phase 3: API Routes ✅ COMPLETED

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
// 4. Call wolfGetMeasurements() and wolfGetBatteryVoltage() in parallel
// 5. Merge battery voltage into lastValues
// 6. Return { lastValues, history }
```

---

### Phase 4: UI Components ✅ COMPLETED

#### 4.1 Scale Sensor Display
**File**: `src/components/hive/WolfSensorDisplay.tsx`

Displays real-time Wolf Waagen sensor data organized into two groups:

**Weight Section:**
- Current Weight (kg) - blue styling
- 24h Change (kg) - green/red based on +/- (daily yield from API)
- 7 Days Change (kg) - green/red based on +/-
- 30 Days Change (kg) - green/red based on +/-

**Environmental Section:**
- Temperature (°C) - sky blue styling
- Brood Temperature (°C) - orange styling
- Humidity (%) - cyan styling
- Rain (mm) - indigo styling
- Wind Speed (km/h) - slate styling
- Wind Direction (°) - violet styling
- Battery Voltage (V) - green/yellow/red based on level
  - ≥70% (≥3.9V): Green with full battery icon
  - 30-69% (3.5-3.9V): Yellow with medium battery icon
  - <30% (<3.5V): Red with low battery icon
  - Shows both voltage and percentage (e.g., "3.9 V (70%)")

Each section only displays when data is available for that category.

#### 4.2 Scale History Chart
**File**: `src/components/hive/WolfHistoryChart.tsx`

Chart.js line chart with:
- Period selector (Hour, Day, Week, Month, Year, Custom)
- Dual Y-axis (Weight + Temperature)
- Dark mode support
- Custom date range picker

#### 4.3 Scale Selection Modal
**File**: `src/components/hive/WolfScaleSelectionModal.tsx`

Modal for selecting Wolf Waagen scale:
- List available scales from API
- Show serial number and last transmission time
- Show current assignment status
- Allow reassignment between hives

---

### Phase 5: Profile Page Integration ✅ COMPLETED

**File**: `src/app/dashboard/profile/page.tsx`

Added Wolf Waagen section:

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

### Phase 6: Hive Detail Page Integration ✅ COMPLETED

**File**: `src/app/dashboard/hives/[id]/page.tsx`

Updated scale section to support both BEEP and Wolf Waagen:

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

### Phase 7: Hives List Page ✅ COMPLETED

**File**: `src/app/dashboard/hives/page.tsx`

Added Wolf scale icon to hive cards:

```tsx
{hive.wolf_scale_id && (
  <span title="Wolf Waagen scale connected">
    <Scale size={18} className="text-blue-600" />
  </span>
)}
```

*Use blue color to visually distinguish from BEEP (amber)*

---

## Files Created/Modified

| File | Status | Description |
|------|--------|-------------|
| Database migration | ✅ DONE | Added wolf columns to profiles and hives |
| `src/lib/wolf-waagen-api.ts` | ✅ DONE | Wolf Waagen API client library (223 lines) |
| `src/app/api/wolf-waagen/connect/route.ts` | ✅ DONE | Connect endpoint - validates token, stores in profile |
| `src/app/api/wolf-waagen/disconnect/route.ts` | ✅ DONE | Disconnect endpoint - clears token and assignments |
| `src/app/api/wolf-waagen/scales/route.ts` | ✅ DONE | List scales with hive assignment info |
| `src/app/api/wolf-waagen/data/route.ts` | ✅ DONE | Sensor data with period filtering + custom dates |
| `src/components/hive/WolfSensorDisplay.tsx` | ✅ DONE | Real-time display (202 lines) |
| `src/components/hive/WolfHistoryChart.tsx` | ✅ DONE | Historical chart with Chart.js (316 lines) |
| `src/components/hive/WolfScaleSelectionModal.tsx` | ✅ DONE | Scale picker modal (221 lines) |
| `src/app/dashboard/profile/page.tsx` | ✅ DONE | Added Wolf connection UI section |
| `src/app/dashboard/hives/[id]/page.tsx` | ✅ DONE | Added Wolf scale section with mutual exclusion |
| `src/app/dashboard/hives/page.tsx` | ✅ DONE | Added blue scale icon for Wolf hives |
| `src/types/hive.ts` | ✅ DONE | Added wolf_scale_id, wolf_scale_name fields |
| `src/lib/ai/tools/scales.ts` | ✅ DONE | AI tools for scale data queries (373 lines) |
| `src/lib/ai/tools/index.ts` | ✅ DONE | Registered scale tools |

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

- [x] Wolf API token validation on connect
- [x] Scale list fetches correctly
- [x] Scale assignment to hive works
- [x] Real-time data displays properly
- [x] Historical chart renders with data
- [x] Time period filters work
- [x] Custom date range works
- [x] Shared hive access works for team members
- [x] Disconnect clears all assignments
- [x] Error states handled gracefully
- [x] Loading states display
- [x] Dark mode styling correct
- [x] Mobile responsive

---

## Security Considerations

- Wolf API token stored server-side in database (protected by RLS)
- All Wolf API calls go through server-side proxy routes
- Token never exposed to client-side JavaScript
- Auth verification on all API endpoints
- Team access control for shared hives

---

## Implementation Order

1. ✅ **Database migration** - Add columns
2. ✅ **API client library** - Core Wolf API functions
3. ✅ **API routes** - Server-side endpoints
4. ✅ **Profile page** - Connection UI
5. ✅ **Display components** - Sensor display + chart
6. ✅ **Selection modal** - Scale picker
7. ✅ **Hive detail integration** - Wire up components
8. ✅ **Hives list** - Scale icon indicator
9. ✅ **AI Tools** - Scale data query tools
10. ✅ **Testing** - Verify all functionality

---

## Review Summary - January 14, 2026

### Implementation Complete ✅

All phases of the Wolf Waagen integration have been successfully implemented.

### Key Implementation Details

#### API Client Library (`src/lib/wolf-waagen-api.ts`)
- **Types**: `WolfScale`, `WolfSensorReading`, `WolfParsedReading`
- **Functions**:
  - `wolfGetScales()` - Fetch user's scales
  - `wolfGetMeasurements()` - Fetch historical data with resolution
  - `wolfGetLastValues()` - Get latest reading (uses 24h export window)
- **Helper**: `parseWolfValue()` for parsing "23.550 [kg]" → 23.550

#### API Routes
- **connect**: Validates token via `wolfGetScales()`, stores in profile
- **disconnect**: Clears token from profile, clears `wolf_scale_id` from all user hives
- **scales**: Returns scales enriched with hive assignment info
- **data**: Supports period filtering (hour/day/week/month/year/custom) and team access

#### UI Components
- **WolfSensorDisplay**: Shows weight, daily yield (±), temperature, brood temp, humidity
- **WolfHistoryChart**: Chart.js dual-axis chart with time period selector and custom date range
- **WolfScaleSelectionModal**: Scale picker with assignment status and remove option

#### Hive Integration
- Profile page: API token input form, connected state display
- Hive detail: Sensor display + chart when connected, connect button for owners
- Hives list: Blue scale icon distinguishes Wolf from BEEP (amber)
- **Mutual exclusion**: Only one scale type per hive (Wolf clears BEEP, and vice versa)

#### AI Tools (`src/lib/ai/tools/scales.ts`)
- `getScaleData` - Current readings for a hive (works with both BEEP and Wolf)
- `getScaleHistory` - Historical data with summary stats
- `getHivesWithScales` - List all hives with connected scales

### Differences from BEEP Integration

| Aspect | BEEP | Wolf Waagen |
|--------|------|-------------|
| Auth | Email/password → token | Direct API token |
| Last values | Dedicated endpoint | Export last 24h |
| Data format | Numeric | Strings with units (parsed) |
| Icon color | Amber | Blue |
| Battery | Single endpoint | Separate Trachtnet endpoint |
| Extra sensors | Audio, bee count | Rain, wind, brood temp, GPS |

### Code Quality
- TypeScript strict typing throughout
- Consistent error handling with user-friendly messages
- Loading states and empty state handling
- Dark mode support
- Mobile responsive design

---

## Bug Fixes - January 14, 2026

### Fix 1: API Response Structure Mismatch

**Issue**: Wolf Waagen API returned different field names than documented.

**Changes Made**:
- `WolfScale.scale` → `WolfScale.scale_id` (API returns `scale_id` not `scale`)
- Response field `data` → `scales` (API returns `scales` array not `data`)

**Files Updated**:
- `src/lib/wolf-waagen-api.ts` - Updated interface and response parsing
- `src/components/hive/WolfScaleSelectionModal.tsx` - Updated all `scale.scale` → `scale.scale_id`
- `src/app/api/wolf-waagen/scales/route.ts` - Updated assignment map lookup

### Fix 2: Numeric Value Parsing Error

**Issue**: `parseWolfValue()` crashed with `value.match is not a function` because API returns numeric values directly, not just strings.

**Root Cause**: Expected `"23.550 [kg]"` but received `23.550` (number).

**Solution**: Updated `parseWolfValue()` to handle both formats:
```typescript
function parseWolfValue(value: string | number | undefined | null): number | undefined {
  if (value === undefined || value === null) return undefined

  // If already a number, return directly
  if (typeof value === 'number') {
    return isNaN(value) ? undefined : value
  }

  // If string, parse out the numeric part
  if (typeof value === 'string') {
    const match = value.match(/^([\d.-]+)/)
    return match ? parseFloat(match[1]) : undefined
  }

  return undefined
}
```

**Files Updated**:
- `src/lib/wolf-waagen-api.ts` - Updated `parseWolfValue()` function and `WolfSensorReading` interface

### Actual API Response Format

Confirmed response from Wolf Waagen API:
```json
{
  "success": true,
  "scales": [
    {
      "scale_id": "R4JLXN",
      "serial_number": "42M03446",
      "hardware_key": "API42",
      "latest_transmission_timestamp": "2026-01-14T14:58:16.000000Z"
    }
  ]
}
```

**Key Differences from Initial Documentation**:
| Expected | Actual |
|----------|--------|
| `data` array | `scales` array |
| `scale` field | `scale_id` field |
| String values only | Both string and numeric values |

---

## Feature Update - January 15, 2026

### Battery Voltage Display (Partial Implementation)

Attempted to add battery voltage support using the Trachtnet export endpoint.

#### Changes Made

**1. API Client Library** (`src/lib/wolf-waagen-api.ts`)
- Added `battery_voltage` field to `WolfParsedReading` interface
- Added `WolfTrachtnetReading` interface for Trachtnet response
- Added `wolfGetBatteryVoltage()` function that calls `/user/trachtnet/export`
  - Looks up serial number from scale_id (Trachtnet uses serial number)
  - Uses date strings ("YYYY-MM-DD") instead of Unix timestamps
  - Fetches last 24 hours of data
  - Returns most recent battery voltage or null

**2. Data Route** (`src/app/api/wolf-waagen/data/route.ts`)
- Imports new `wolfGetBatteryVoltage` function
- Fetches sensor data and battery voltage in parallel using `Promise.all`
- Merges battery voltage into lastValues response

**3. Sensor Display** (`src/components/hive/WolfSensorDisplay.tsx`)
- Added battery icon imports (`BatteryLow`, `BatteryMedium`, `BatteryFull`)
- Added `getBatteryInfo()` helper to calculate percentage from voltage
  - 4.2V = 100% (fully charged)
  - 3.2V = 0% (empty)
- Added battery display card with color coding:
  - **Green** (≥70%): Full battery icon
  - **Yellow** (30-69%): Medium battery icon
  - **Red** (<30%): Low battery icon
- Shows both voltage and percentage (e.g., "3.9 V (70%)")
- Uses `typeof batteryVoltage === 'number'` check to prevent crashes

#### Technical Notes

The Trachtnet endpoint (`/user/trachtnet/export`) differs from the scale export endpoint:
- Uses serial number instead of scale_id
- Uses date strings instead of Unix timestamps
- Returns raw numeric values instead of strings with units
- Includes additional fields: GPS coordinates, battery voltage
- Does not include brood temperature or yield

#### Known Limitation

**Battery voltage may not be available for all scales.** Testing revealed that the Trachtnet endpoint does not return battery data for all Wolf Waagen scale models. The implementation is in place and will display battery voltage if the API returns it, but some scales (e.g., ApiGraph 4.0) may not report battery through this endpoint.

The feature fails gracefully - if no battery data is returned, the battery card simply doesn't appear in the UI.

---

## Feature Update - January 15, 2026 (Weather Sensors)

### Weather Sensor Display

Added display support for weather sensors returned by Wolf Waagen API.

#### New Sensors Displayed
- **Rain** (mm) - Precipitation with indigo color scheme and CloudRain icon
- **Wind Speed** (km/h) - Wind speed with slate color scheme and Wind icon
- **Wind Direction** (°) - Wind direction in degrees with violet color scheme and Compass icon

#### Display Reorganization

Grouped sensor display into two logical sections:

**Weight Section:**
- Current weight
- 24h change (daily yield)
- 7-day weight change
- 30-day weight change

**Environmental Section:**
- Temperature
- Brood temperature
- Humidity
- Rain
- Wind speed
- Wind direction (with cardinal direction, e.g., "SE (134°)")
- Battery

Each section header only displays when there's data for that category. This provides a cleaner, more organized view of sensor data.

#### Weight Change Calculations

The API route fetches 7-day and 30-day historical data in parallel and calculates weight changes:

```typescript
const [lastValues, batteryVoltage, history7d, history30d] = await Promise.all([
  wolfGetLastValues(wolfApiToken, scaleId),
  wolfGetBatteryVoltage(wolfApiToken, scaleId),
  wolfGetMeasurements(wolfApiToken, scaleId, sevenDaysAgo, now, 'daily'),
  wolfGetMeasurements(wolfApiToken, scaleId, thirtyDaysAgo, now, 'daily'),
])

// Calculate changes from oldest to newest weight
weightChange7d = newestWeight - oldestWeight
weightChange30d = newestWeight - oldestWeight
```

#### Cardinal Wind Direction

Wind direction is now displayed as cardinal direction with degrees in parentheses:
- Converts degrees to N, NE, E, SE, S, SW, W, NW
- Example: `SE (134°)` instead of just `134°`

#### Files Modified
- `src/components/hive/WolfSensorDisplay.tsx` - Added weather sensors, weight changes, cardinal direction
- `src/app/api/wolf-waagen/data/route.ts` - Added 7-day and 30-day weight change calculations

---

## Feature Update - January 31, 2026

### Rate Limiting Fixes

Added resilience to handle Wolf Waagen API rate limiting (429 errors).

#### Changes to API Client (`src/lib/wolf-waagen-api.ts`)

Added `fetchWithRetry()` helper function:
- Automatically retries on 429 rate limit errors
- Exponential backoff: 2s, 4s, 8s, 16s delays
- Maximum 3 retries before returning the response

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options)
    if (response.status === 429 && attempt < maxRetries) {
      const waitTime = Math.pow(2, attempt + 1) * 1000
      await delay(waitTime)
      continue
    }
    return response
  }
}
```

#### Changes to Data Route (`src/app/api/wolf-waagen/data/route.ts`)

- Changed from parallel API calls to sequential calls (reduces rate limiting)
- Each API call wrapped in try/catch - returns partial data on failure
- Removed previous period comparisons to reduce API calls
- Uses `yield_kg` from lastValues for 24h change (already provided by Wolf API)

**Resilient data fetching:**
- `lastValues` - returns null if fails
- `history7d` - returns empty array if fails
- `history30d` - returns empty array if fails
- `batteryVoltage` - returns null if fails
- `history` (chart) - returns empty array if fails

### Brood Temperature Display

Updated to show brood temperature (instead of ambient) consistently across the app.

#### Scale Overview Card (`src/components/research/HiveScaleCard.tsx`)

- Changed Wolf scales to display `brood_temp_c` instead of `temperature_c`
- Now uses Flame icon (same as BEEP) instead of Thermometer icon
- Title updated to "Brood temperature" for both scale types

#### History Chart (`src/components/hive/WolfHistoryChart.tsx`)

- Changed from ambient temperature to brood temperature (`brood_temp_c`)
- Changed line colour from orange to **blue** (`rgb(37, 99, 235)`) for better contrast with amber weight line
- Y-axis label updated to "Brood Temp (°C)" with blue colour

**Chart Colour Scheme:**
| Data | Colour | RGB |
|------|--------|-----|
| Weight (kg) | Amber | `rgb(217, 119, 6)` |
| Brood Temp (°C) | Blue | `rgb(37, 99, 235)` |

### Files Modified

| File | Changes |
|------|---------|
| `src/lib/wolf-waagen-api.ts` | Added `fetchWithRetry()` with exponential backoff |
| `src/app/api/wolf-waagen/data/route.ts` | Sequential API calls, resilient error handling |
| `src/components/research/HiveScaleCard.tsx` | Display brood temp with Flame icon |
| `src/components/hive/WolfHistoryChart.tsx` | Brood temp line in blue colour |

---

## Verified API Response - February 5, 2026

### Live Data Verification

Tested the Wolf Waagen API with connected scales to verify the actual response format.

#### Raw API Response (Hourly Resolution)
```json
{
  "time": "2026-02-05T21:00:00+01:00",
  "weight": 47.36,
  "yield": -0.11,
  "temperature": 5.7,
  "brood": 29.6,
  "humidity": 93.8,
  "rain": 0,
  "wind_speed": 15.72,
  "wind_direction": 94
}
```

#### Parsed Response (After Processing)
```json
{
  "time": "2026-02-05T21:00:00+01:00",
  "weight_kg": 47.36,
  "yield_kg": -0.11,
  "temperature_c": 5.7,
  "brood_temp_c": 29.6,
  "humidity_percent": 93.8,
  "rain_mm": 0,
  "wind_speed_kmh": 15.72,
  "wind_direction_deg": 94
}
```

#### Key Findings

1. **Numeric Values**: All sensor values are returned as raw numbers (not strings with units)
2. **Weight & Yield Always Present**: Every reading includes both `weight` and `yield` fields
3. **Yield Meaning**: The `yield` value represents the weight change since the previous reading
   - Positive values = weight gain (e.g., nectar flow)
   - Negative values = weight loss (e.g., consumption, swarming)
4. **Brood Temperature**: Consistently available and indicates colony health (typical range: 25-35°C)

#### Sample Data from Connected Scales

| Scale | Weight (kg) | Yield (kg) | Brood Temp (°C) | Humidity (%) |
|-------|-------------|------------|-----------------|--------------|
| PE8QO7 | 47.36 | -0.11 | 29.6 | 93.8 |
| R4JLXN | 45.29 | -0.105 | 26.2 | 93.8 |

*Data captured: 5 February 2026, 21:00 CET*

---

## Feature Update - February 5, 2026

### Adjusted Yield Calculation

Added automatic detection and exclusion of maintenance events (feeding, harvesting) from 7-day and 30-day weight change calculations.

#### Problem

Previously, if a beekeeper added 3kg of feed to a hive, the 7-day weight change would show +3kg even though the colony only gained ~0.1kg naturally. This made it difficult to assess actual colony performance.

#### Solution

The system now detects maintenance events by comparing the raw weight change between readings against the reported yield:

```
intervention = (weight_after - weight_before) - yield
```

If `|intervention| > 0.5kg`, it's flagged as a maintenance event (feeding or harvesting).

#### Example

| Metric | Value |
|--------|-------|
| Weight before | 42.9 kg |
| Weight after | 46.3 kg |
| Raw weight delta | +3.4 kg |
| Reported yield | +0.06 kg |
| **Detected intervention** | +3.34 kg (feed added) |
| **Adjusted 7d change** | +0.06 kg (natural activity) |

#### Implementation

**New functions in `src/lib/wolf-waagen-api.ts`:**
- `detectMaintenanceEvents(history, threshold)` - Scans readings for interventions
- `sumInterventions(events)` - Totals all detected interventions

**Updated API route (`src/app/api/wolf-waagen/data/route.ts`):**
- Detects maintenance events in 7d and 30d history
- Subtracts total interventions from raw weight changes
- Returns adjusted values (same field names, cleaner data)

#### Behaviour

| Field | Calculation |
|-------|-------------|
| `weightChange24h` | Uses `yield_kg` directly (already natural) |
| `weightChange7d` | Raw change minus detected interventions |
| `weightChange30d` | Raw change minus detected interventions |

**No UI changes required** - both display components (`WolfSensorDisplay.tsx` and `HiveScaleCard.tsx`) automatically use the adjusted values from the API.

---

## Feature Update - February 6, 2026

### Synced Period Selection

Combined the sensor display and history chart into a single `WolfScalePanel` component with unified period selection. Stats now update to reflect the selected time period.

#### Problem

Previously, the sensor display showed fixed time comparisons (24h, 7d, 30d) while the chart had its own independent period selector. Changing the chart period didn't update the stats, which was confusing.

#### Solution

Created a new combined `WolfScalePanel` component that:
1. Has a single period selector (Hour, Day, Week, Month, Year, Custom)
2. Fetches data once for the selected period
3. Calculates and displays period-specific stats
4. Shows the history chart for the same period

#### Stats Calculated from Period Data

| Stat | Calculation |
|------|-------------|
| Current Weight | Latest weight reading in period |
| Period Change | Sum of all `yield_kg` values (natural weight change) |
| Avg Brood Temp | Average of `brood_temp_c` readings |
| Avg Temp | Average of `temperature_c` readings |
| Avg Humidity | Average of `humidity_percent` readings |
| Total Rain | Sum of `rain_mm` readings |
| Avg Wind | Average of `wind_speed_kmh` readings |
| Wind Direction | Latest `wind_direction_deg` reading |
| Battery | Latest `battery_voltage` reading |

#### Component Architecture

**Before (two separate components):**
```
WolfSensorDisplay (fixed 24h/7d/30d stats)
    ↓
WolfHistoryChart (own period state)
```

**After (combined component):**
```
WolfScalePanel
  ├── Period Selector (shared state)
  ├── Stats Display (calculated from period data)
  └── History Chart (same period data)
```

#### Files Changed

| File | Change |
|------|--------|
| `src/components/hive/WolfScalePanel.tsx` | NEW - Combined component (587 lines) |
| `src/app/dashboard/hives/[id]/page.tsx` | Use WolfScalePanel instead of separate components |

**Deprecated (still exist but unused):**
- `src/components/hive/WolfSensorDisplay.tsx`
- `src/components/hive/WolfHistoryChart.tsx`

#### Usage

```tsx
<WolfScalePanel
  scaleId={hive.wolf_scale_id}
  scaleName={hive.wolf_scale_name}
  hiveId={hiveId}
/>
```

#### User Experience

1. User selects a period (e.g., "Week")
2. Component fetches history data for that week
3. Stats show weekly averages and totals
4. Chart displays the week's data
5. All updates happen together with a single API call
