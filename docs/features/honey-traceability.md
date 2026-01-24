# Honey Traceability Module

Track honey from hive to jar with EU-compliant lot numbers.

## Overview

The Honey Traceability module enables beekeepers to:
- Track bulk containers that hold extracted honey from multiple harvests
- Link harvests to containers for origin tracking
- Create bottling batches with auto-generated EU lot codes
- Calculate origin percentages for multi-apiary honey blends

## Access

Navigate to **Dashboard → Traceability** in the sidebar.

## Features

### Bulk Containers

Containers represent physical storage vessels (buckets, tanks, drums) that hold extracted honey.

**Fields:**
- **Container Code** - Unique identifier (e.g., "Bucket-01", "Tank-A")
- **Container Type** - bucket, tank, drum, or other
- **Extraction Date** - When honey was extracted into this container
- **Total Weight (kg)** - Optional weight of honey in container
- **Notes** - Optional notes
- **Linked Harvests** - Select which harvest records contributed to this container

**Origin Tracking:**
When you link harvests from different apiaries, the system automatically calculates origin percentages based on harvest weights (e.g., "60% Cork, 40% Kerry").

### Bottling Batches

Batches represent a production run of jarred honey from one or more containers.

**Fields:**
- **Batch Code** - Auto-generated EU lot number (format: L-YYYY-MM-NNN)
- **Batch Date** - Date of bottling
- **Best Before Date** - Defaults to 2 years from batch date
- **Jar Size (ml)** - Common sizes: 125, 250, 340, 454, 500, 750, 1000ml
- **Net Weight (g)** - Jar net weight in grams (for EU compliance)
- **Jar Count** - Number of jars produced
- **Total Weight (kg)** - Optional total batch weight
- **Public** - Whether consumers can look up this batch
- **Notes** - Optional notes
- **Source Containers** - Select which containers were used

## Batch Code vs Trace Code

Each batch has two codes serving different purposes:

### Batch Code (Lot Number)

Your EU-compliant lot number for jar labels. Sequential per user per month.

```
L-2026-01-001
│ │    │  │
│ │    │  └── Sequential number (001-999 per month per user)
│ │    └───── Month (01-12)
│ └────────── Year
└──────────── "L" prefix (EU Lot identifier)
```

**Note:** Different beekeepers can have the same batch code (e.g., both can have `L-2026-01-001`) since each operates independently.

### Trace Code (Public URL)

A globally unique 8-character alphanumeric code for public traceability URLs.

```
A1B2C3D4
```

- Automatically generated when creating a batch
- Guaranteed unique across all users
- Used in QR codes and public URLs
- Cannot be duplicated

## Workflow

1. **Record Harvests** - Use the Records page to log harvests from hives
2. **Create Container** - Create a bulk container and link harvests to it
3. **Create Batch** - When bottling, create a batch from one or more containers
4. **Label Jars** - Use the generated batch code on your jar labels

## Database Schema

### Tables

**bulk_containers**
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Owner (FK → profiles) |
| container_code | VARCHAR(50) | Unique code per user |
| container_type | VARCHAR(50) | bucket, tank, drum, other |
| extraction_date | DATE | When honey was extracted |
| total_weight_kg | NUMERIC | Optional weight |
| notes | TEXT | Optional notes |

**container_harvests** (junction table)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| container_id | UUID | FK → bulk_containers |
| harvest_id | UUID | FK → harvests |

**batch_runs**
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Owner (FK → profiles) |
| batch_code | VARCHAR(20) | EU lot number (per user) |
| trace_code | VARCHAR(12) | Globally unique public trace code |
| batch_date | DATE | Bottling date |
| total_weight_kg | NUMERIC | Optional total weight |
| jar_size_ml | INTEGER | Jar size in ml |
| jar_weight_g | INTEGER | Net weight in grams |
| jar_count | INTEGER | Number of jars |
| best_before_date | DATE | Best before date |
| notes | TEXT | Optional notes |
| is_public | BOOLEAN | Allow public lookup |
| public_title | TEXT | Custom title for public display |
| public_origin | TEXT | Custom origin text for public display |
| public_story | TEXT | Custom story text for public display |

**batch_containers** (junction table)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| batch_id | UUID | FK → batch_runs |
| container_id | UUID | FK → bulk_containers |
| weight_used_kg | NUMERIC | Optional weight used |

### Row Level Security

- Users can only access their own containers and batches
- Public batches can be viewed by anyone (for future consumer lookup feature)

## Files

| File | Description |
|------|-------------|
| `src/app/dashboard/traceability/page.tsx` | Main page with Containers and Batches tabs |
| `src/app/(public)/trace/[batchCode]/page.tsx` | Public consumer batch lookup page |
| `src/components/tools/TraceabilityTool.tsx` | Main traceability tool component |
| `src/types/traceability.ts` | TypeScript type definitions |
| `src/lib/batch-code.ts` | Batch code generation utilities |
| `src/lib/traceability-utils.ts` | Origin calculation utilities |
| `src/lib/story-templates.ts` | Story template definitions and placeholder logic |
| Database: `get_public_batch_info()` | RPC function for public batch lookup |

## Story Templates

When creating a batch, users can choose from 4 pre-written story templates that auto-populate with batch data:

### Available Templates

1. **Floral Forager** (Taste & Nature Focus)
   - Best for highlighting specific tasting notes and nectar sources
   - Auto-fills: Season, location, apiary name, floral sources

2. **The Purist** (Raw & Process Focus)
   - Best for emphasizing quality, raw status, and health benefits
   - Auto-fills: Beekeeper name, harvest date, location

3. **The Terroir** (Location Focus)
   - Best for locally sold honey where customers know the area
   - Auto-fills: Location, apiary name, month
   - User fills: Local landmark, weather condition

4. **Seasonal Snapshot** (Time & Weather Focus)
   - Best for connecting consumers to the specific moment in time
   - Auto-fills: Batch code, season, year, floral source
   - User fills: Weather description, color, bottling location

### How to Use

1. In the batch form, enable "Public" toggle
2. Select a story template from the radio options
3. The template populates with your batch data
4. Edit the text to replace any `[bracketed placeholders]` with your own words
5. Customize further as desired

### Visual Highlighting

The story editor shows a live preview with color-coded highlighting:

- **Green (Auto-filled)** - Values automatically populated from your data (beekeeper name, location, apiary, floral sources, dates, etc.)
- **Red (Needs input)** - Placeholders you must fill in manually (e.g., `[Taste Profile]`, `[Weather Condition]`)

A legend at the top of the preview explains the colors.

### Save Validation

If you try to save a public batch with unfilled `[placeholders]` remaining, an error toast will appear listing the placeholders that need to be filled in. You must replace all red placeholders before saving.

### Placeholders

Templates use placeholders that are automatically replaced:
- `[Season]`, `[Month]`, `[Year]` - From batch date
- `[Location]` - County from apiary
- `[Apiary Name]` - From linked containers
- `[Floral Source]` - From harvest records
- `[Beekeeper Name]` - From profile
- `[Batch Code]` - Current batch code

User-filled placeholders (remain as `[placeholder]` for you to customize):
- `[Taste Profile]`, `[Weather Condition]`, `[Local Landmark]`, `[Color]`, `[Bottling Location]`

## Public Consumer Lookup

Consumers can look up batch information by scanning the QR code on the jar label.

### URL Format

```
https://www.hivecraic.com/trace/A1B2C3D4
                              └── trace_code (8 characters)
```

The URL uses the `trace_code` (not the batch_code) to ensure global uniqueness.

### Consumer View

The trace page uses a story-driven design to build consumer trust:

**Hero Section:**
- **Title:** "Pure Irish Honey"
- **Location:** Prominently displayed origin (e.g., "Harvested in Meath, Ireland")
- **Map:** Optional interactive map with 5km foraging radius circle (if beekeeper has enabled location sharing). Labeled "Source Apiary Foraging Area (~5km)"

**Story Section:**
- Personalized narrative: "Harvested by [Beekeeper Name] from [Apiary Name]. The bees foraged on [Floral Sources]."

**Details Section:**
- **Net Weight** - Displayed in grams (EU requirement)
- **Bottled Date** - When the honey was jarred
- **Best Before Date** - Expiry date
- **Batch Code** - De-emphasized in footer (for reference only)

**Footer:**
- "Traced from hive to jar" verification badge

### Privacy & Security

- Only batches marked as **Public** (`is_public = true`) are visible
- Non-existent and non-public batches show the same "Batch Not Found" message (prevents enumeration)
- No user IDs, notes, or sensitive data is exposed
- GPS coordinates are only shown if `share_location = true` on the apiary, and are fuzzed by ±0.01° for privacy
- Database function uses `SECURITY DEFINER` to safely bypass RLS

### Database Function

The `get_public_batch_info(trace_code)` function:
1. Looks up the batch by `trace_code` (globally unique)
2. Validates the batch exists and is public
3. Gets beekeeper name from profiles (first_name or full_name)
4. Traverses the traceability chain: `batch_runs` → `batch_containers` → `bulk_containers` → `container_harvests` → `harvests` → `hives` → `apiaries`
5. Calculates origin percentages based on harvest weights
6. Aggregates unique floral sources from linked harvests
7. Includes map coordinates (fuzzed) if share_location is enabled
8. Returns consumer-safe JSON or NULL

### QR Code Generation

Each public batch has a QR code button that opens a modal with:
- Scannable QR code linking to the trace page (uses `trace_code` in URL)
- The full URL displayed below the code
- **Download PNG** button to save the QR code for printing on jar labels

To use:
1. Go to **Tools → Honey Provenance → Batches**
2. Click the QR icon on any public batch
3. Download the PNG and add it to your jar labels

**Note:** The QR code links to the unique `trace_code` URL, while your jar label can display the `batch_code` as the EU lot number.

### QR Code Preview (Edit Form)

When editing an existing public batch, a QR code preview is shown at the top of the form:
- Small QR code thumbnail
- Clickable trace URL that opens in a new window for preview
- Allows you to quickly verify how the public page looks before saving changes

## Future Enhancements
- **PDF Label Export** - Export printable labels with batch info
- **External Honey Blending** - Track imported honey with manual country-of-origin
- **Offline Mode** - Queue harvests when offline

## Changelog

### January 24, 2026
- Added QR code preview with clickable link on batch edit form (opens trace page in new window)
- Added visual highlighting for story templates: auto-filled values in green, unfilled placeholders in red
- Added save validation: blocks saving if unfilled `[placeholders]` remain with error toast
- Added legend explaining color coding (Auto-filled / Needs input)
- Changed map label to "Source Apiary Foraging Area (~5km)"
- Fixed origin headline to not assume "Co." prefix (location name used as-is)

### January 23, 2026
- Added `jar_weight_g` field for EU net weight compliance
- Added `floral_source` field to harvests (database-driven dropdown from dropdown_values table)
- Changed harvest floral source label to "Predominant Floral Source (>50%)"
- Redesigned trace page with story-driven layout
- Added beekeeper name display from profiles
- Added optional map display with 5km radius circle using Leaflet.js (when share_location enabled)
- Changed public header "Sign In" to subtle "Beekeeper Login" text link
- Added editable public display fields (public_title, public_origin, public_story)
- Added 4 story templates: Floral Forager, The Purist, The Terroir, Seasonal Snapshot
- Templates auto-populate with batch data and allow customization
- Added `trace_code` for globally unique public URLs (separate from user's batch_code)
- Batch codes remain per-user sequential; trace codes are globally unique 8-character alphanumeric
- QR codes now link to trace_code URLs for guaranteed uniqueness
