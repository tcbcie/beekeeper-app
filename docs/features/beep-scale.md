# BEEP Hive Scale Integration

## Overview

Integrate BEEP hive scales to allow users to connect their scales and display sensor data (weight, temperature, humidity, etc.) on hive detail pages.

**Important**: BEEP is a completely separate scale technology from Wolf Waagen. This integration is independent and unrelated to Wolf Waagen - they are different products from different manufacturers with different APIs.

---

## BEEP API Reference

**Manufacturer**: BEEP (Netherlands)
**Base URL**: `https://api.beep.nl/api`
**Documentation**: https://api.beep.nl/docs/

**Authentication**: Bearer token via login endpoint
```
Authorization: Bearer <api_token>
```

### Endpoints

#### 1. Login
```
POST /login
```
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```
**Response:**
```json
{
  "api_token": "...",
  "user": {
    "id": 123,
    "name": "User Name",
    "email": "user@example.com"
  }
}
```

#### 2. List Devices
```
GET /devices
```
**Response:**
```json
{
  "devices": [
    {
      "id": 123,
      "key": "abc123",
      "name": "My Scale",
      "hive_id": null,
      "type": "beep_base",
      "last_message_received": "2026-01-15T10:00:00Z",
      "hardware_id": "...",
      "firmware_version": "1.5.0",
      "battery_voltage": 4.1
    }
  ]
}
```

#### 3. Get Sensor Data
```
GET /sensors/lastvalues?key={device_key}
```
**Response:**
```json
{
  "weight_kg": 45.2,
  "weight_kg_corrected": 44.8,
  "t_i": 35.2,
  "h": 65,
  "bv": 4.1
}
```

#### 4. Get Measurements (Historical)
```
GET /sensors/measurements?key={device_key}&start={iso_date}&end={iso_date}
```

### BEEP Sensor Data
- **weight_kg**: Raw hive weight in kg
- **weight_kg_corrected**: Corrected/calibrated weight in kg
- **t_i**: Inside temperature in °C
- **t**: Temperature in °C
- **t_0, t_1**: Additional temperature sensors
- **h**: Relative humidity in %
- **p**: Atmospheric pressure
- **bv**: Battery voltage in V
- **s_fan_4, s_fan_6, s_fan_9**: Audio frequency sensors
- **bc_i, bc_o**: Brood count inside/outside

---

## Implementation

### Database Schema

**Columns in `profiles` table:**
```sql
beep_api_token TEXT
beep_connected_at TIMESTAMPTZ
```

**Columns in `hives` table:**
```sql
beep_device_id TEXT
beep_device_name TEXT
```

---

### API Client Library

**File**: `src/lib/beep-api.ts`

```typescript
// Types
export interface BeepDevice { ... }
export interface BeepSensorReading { ... }
export interface BeepLoginResponse { ... }

// Functions
export async function beepLogin(email: string, password: string): Promise<BeepLoginResponse>
export async function beepGetDevices(apiToken: string): Promise<BeepDevice[]>
export async function beepGetLastValues(apiToken: string, deviceKey: string): Promise<BeepSensorReading>
export async function beepGetMeasurements(apiToken: string, deviceKey: string, start: string, end: string): Promise<BeepSensorReading[]>
```

---

### API Routes

**Directory**: `src/app/api/beep/`

- **connect**: `POST /api/beep/connect` - Login and store token
- **disconnect**: `POST /api/beep/disconnect` - Clear token and assignments
- **devices**: `GET /api/beep/devices` - List devices with assignment info
- **data**: `GET /api/beep/data` - Get sensor data and history

The data route calculates 7-day and 30-day weight changes by fetching historical data and comparing oldest to newest weights.

---

### UI Components

#### Scale Sensor Display
**File**: `src/components/hive/ScaleSensorDisplay.tsx`

Displays real-time BEEP sensor data organized into two groups:

**Weight Section:**
- Current Weight (kg) - amber styling
- 7 Days change (kg) - green/red based on +/-
- 30 Days change (kg) - green/red based on +/-

**Environmental Section:**
- Temperature (°C) - blue styling
- Humidity (%) - cyan styling
- Battery (%) - green/red based on level
  - ≥20%: Green
  - <20%: Red (low battery warning)

Each section only displays when data is available for that category.

#### Scale History Chart
**File**: `src/components/hive/ScaleHistoryChart.tsx`

Chart.js line chart with:
- Period selector (Hour, Day, Week, Month, Year, Custom)
- Dual Y-axis (Weight in amber, Temperature in blue)
- Dark mode support
- Custom date range picker

#### Device Selection Modal
**File**: `src/components/hive/ScaleSelectionModal.tsx`

Modal for selecting BEEP device:
- List available devices from API
- Show device name and last transmission time
- Show current assignment status
- Allow reassignment between hives: assigning a scale takes it off your other hive, so it moves. A scale can be on only one hive per account; unique indexes on `hives (user_id, scale id)` enforce this (batch 35, 23/10/2026)

---

### Profile Page Integration

**File**: `src/app/dashboard/profile/page.tsx`

BEEP section with email/password login form:
```tsx
{/* BEEP Integration */}
<div className="card">
  <h3>BEEP Scale</h3>
  {beepConnected ? (
    <>
      <p>Connected • {deviceCount} device(s)</p>
      <button onClick={handleDisconnect}>Disconnect</button>
    </>
  ) : (
    <form onSubmit={handleConnect}>
      <input type="email" placeholder="BEEP Email" />
      <input type="password" placeholder="BEEP Password" />
      <button type="submit">Connect</button>
    </form>
  )}
</div>
```

---

### Hive Detail Page Integration

**File**: `src/app/dashboard/hives/[id]/page.tsx`

```tsx
{/* BEEP Scale Data */}
{hive.beep_device_id && (
  <>
    <ScaleSensorDisplay deviceId={hive.beep_device_id} hiveId={hiveId} />
    <ScaleHistoryChart deviceId={hive.beep_device_id} hiveId={hiveId} />
  </>
)}

{/* Connect BEEP Scale button for owners */}
{isOwner && beepConnected && !hive.beep_device_id && (
  <button onClick={() => setShowScaleModal(true)}>
    Connect BEEP Scale
  </button>
)}
```

---

## Files

| File | Description |
|------|-------------|
| `src/lib/beep-api.ts` | BEEP API client library |
| `src/app/api/beep/connect/route.ts` | Connect endpoint |
| `src/app/api/beep/disconnect/route.ts` | Disconnect endpoint |
| `src/app/api/beep/devices/route.ts` | List devices endpoint |
| `src/app/api/beep/data/route.ts` | Sensor data endpoint with weight changes |
| `src/components/hive/ScaleSensorDisplay.tsx` | Real-time sensor display |
| `src/components/hive/ScaleHistoryChart.tsx` | Historical chart |
| `src/components/hive/ScaleSelectionModal.tsx` | Device picker modal |

---

## Differences from Wolf Waagen

| Aspect | BEEP | Wolf Waagen |
|--------|------|-------------|
| Auth | Email/password login | Direct API token |
| Last values | Dedicated endpoint | Export last 24h |
| Data format | Numeric values | Strings with units (parsed) |
| Icon color | Amber | Blue |
| Battery | In main response | Separate Trachtnet endpoint |
| Extra sensors | Audio frequencies, brood count | Rain, wind, GPS |

---

## Inspection auto-fill

When a hive is linked to a BEEP device (`hives.beep_device_id`) and a beekeeper starts a **new** inspection for that hive, `InspectionForm.tsx` pre-fills the **Weight (kg)** field with the device's latest reading (`lastValues.weight_kg_corrected ?? lastValues.weight_kg`). The field shows a small "Auto-filled from BEEP scale" hint that clears as soon as the user edits the value. Editing an existing inspection never auto-fills — historical readings are preserved. If the user already typed a weight, it is not overwritten. The fetch uses an `AbortController` and silently falls through to manual entry on any error. Precedence vs Wolf Waagen: if both `wolf_scale_id` and `beep_device_id` are set on the hive, Wolf is preferred.

## Feature Updates

### January 15, 2026 - Grouping and Weight Changes

#### Sensor Display Reorganization

Grouped sensor display into two logical sections:

**Weight Section:**
- Current weight
- 7-day weight change
- 30-day weight change

**Environmental Section:**
- Temperature
- Humidity
- Battery

Each section header only displays when there's data for that category.

#### Weight Change Calculations

The API route now fetches 7-day and 30-day historical data in parallel and calculates weight changes:

```typescript
const [lastValues, history7d, history30d] = await Promise.all([
  beepGetLastValues(beepApiToken, deviceId),
  beepGetMeasurements(beepApiToken, deviceId, sevenDaysAgo, now),
  beepGetMeasurements(beepApiToken, deviceId, thirtyDaysAgo, now),
])

// Calculate changes from oldest to newest weight
weightChange7d = newestWeight - oldestWeight
weightChange30d = newestWeight - oldestWeight
```

Uses `weight_kg_corrected` if available, falls back to `weight_kg`.

## Security (batch 7, 17/10/2026)

- When the data route is called with a `hiveId`, it reads with the **hive owner's** vendor token. So the requested `deviceId` must equal that hive's own `beep_device_id`; otherwise it returns 403. Without a `hiveId`, the route uses the caller's own token and can only reach the caller's own account.
- Only the hive's owner can change its scale columns (`beep_device_*`, `wolf_scale_*`); a database trigger enforces this (`guard_hive_scale_columns`). Team members can still view a shared hive's scale but can't point the hive at a different device.
- Errors from the vendor are logged on the server only. The browser gets a generic "Failed to fetch sensor data".

## Connect limits (security batch 11, 18/10/2026)

`/api/beep/connect` and `/api/wolf-waagen/connect` allow 5 attempts per user per hour (`RATE_LIMITS.scaleConnect`), so they can't be used to test credentials against the vendors. Failures return a generic message ("Could not connect to BEEP. Check your email and password."), and the vendor's own error goes to the server log only. The disconnect routes now refuse deactivated accounts.

## Batch 45 (29/10/2026): data route

- **Chart requests:** a request with a `period` (the history chart) returns only `{ history, period }` and skips the 7 summary calls. Opening a hive's scale drops from 15 BEEP calls to 8, and each period change from 8 calls to 1.
- **Custom dates:** checked before any BEEP call by `customRangeError()`: real `YYYY-MM-DD` dates, start not after end, at most 366 days. A bad range gets a 400.
- **Time limits:** `beepFetch` uses `AbortSignal.timeout`, so the limit also covers reading the reply.
- **Browser requests:** scale IDs in request addresses are encoded with `encodeURIComponent`.
