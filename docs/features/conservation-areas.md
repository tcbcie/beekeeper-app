# AMM Conservation Areas

## Overview

HiveCraic displays NIHBS (Native Irish Honey Bee Society) Apis mellifera mellifera (AMM) conservation areas on the Community Map as teal circles. These areas help beekeepers identify zones where native dark honeybee genetics are being preserved, allowing them to make informed decisions about drone flight and colony management.

NIHBS has approximately 360 voluntary conservation areas across the Republic of Ireland and Northern Ireland. See the official list at [nihbs.org/conservation-areas-2022](https://nihbs.org/conservation-areas-2022/).

## Who Can See Conservation Areas

All authenticated users can see conservation areas on the Community Map. No special role is required.

## Two Sources of Conservation Areas

### 1. User-Declared Apiary CAs

Any beekeeper can mark their own shared apiary as a NIHBS conservation area directly from the Apiary form:

1. Navigate to **Apiaries** in the dashboard.
2. Edit (or create) an apiary with a GPS location set.
3. Enable **Share apiary location publicly**.
4. The **Declare as NIHBS Conservation Area** checkbox will appear.
5. Tick the checkbox and optionally adjust the **Conservation area radius (km)** (default 1 km).
6. Save the apiary.

The apiary will now appear as a teal circle on the Community Map in addition to the standard shared apiary marker.

**Note:** If you uncheck "Share apiary location publicly", the conservation area declaration is automatically removed.

### 2. Power User / Admin Managed Land CAs

Power Users and Admins can manage non-apiary land-plot conservation areas (e.g. Birr Castle, Galtee Valley) via the Settings backend:

1. Navigate to **Settings** in the dashboard.
2. Select the **Conservation Areas** tab (visible to Power Users and Admins).
3. Use the **Add Land CA** button to create a new land-plot CA with name, coordinates, radius, county, country, and optional NIHBS URL.
4. Existing land CAs can be edited or deleted from the same table.

Apiary-linked CAs (declared by beekeepers) appear in the table as read-only — they are managed solely by their owner via the Apiary form.

## Map Display

Conservation areas are rendered on the Community Map as:

- **Teal dashed circles** indicating the conservation zone radius.
- **Teal centre marker** (filled circle with location pin icon).
- **Popup on click**: shows name, type (Apiary CA / Land CA), county, description, radius, and an optional "View NIHBS →" link.

A **Conservation Areas (AMM)** toggle in the map control panel lets users show/hide this layer independently.

The count of active conservation areas is shown in the map stats badge.

## Data Model

Conservation areas are stored in the `conservation_areas` table:

| Column | Description |
|---|---|
| `id` | UUID primary key |
| `name` | Display name |
| `type` | `apiary` (user-declared) or `land` (Power User managed) |
| `description` | Optional description |
| `latitude` / `longitude` | Centre coordinates |
| `radius_km` | Conservation zone radius in kilometres |
| `county` | County name (e.g. "Co. Offaly") |
| `country` | `IE` (Republic) or `NI` (Northern Ireland) |
| `nihbs_url` | Link to the NIHBS conservation areas page |
| `apiary_id` | FK to `apiaries` (set for apiary-linked CAs; NULL for land CAs) |
| `user_id` | Owner's profile ID |
| `is_active` | Whether the CA appears on the map |

## RLS Policies

| Operation | Who |
|---|---|
| SELECT | All authenticated users |
| INSERT | Regular users (apiary-linked only) or Power Users/Admins |
| UPDATE | Owner or Power Users/Admins |
| DELETE | Owner or Power Users/Admins |

## Seed Data

The following known NIHBS conservation areas are pre-seeded as land-type CAs (coordinates are approximate and can be refined by Power Users):

| Name | County | Country | Radius |
|---|---|---|---|
| Finnebrogue Woods | Co. Down | NI | 2 km |
| South Kildare (SKBA) | Co. Kildare | IE | 15 km |
| Lough Erne Area (FBKA) | Co. Fermanagh | NI | 10 km |
| Ballyporeen, Galtee Valley | Co. Tipperary | IE | 8 km |
| Kilkenny Castle & Grounds | Co. Kilkenny | IE | 1 km |
| Birr Castle | Co. Offaly | IE | 2 km |
| Mizen Peninsula (Goleen) | Co. Cork | IE | 3 km |
| Ballymachugh, Co. Cavan | Co. Cavan | IE | 5 km |
