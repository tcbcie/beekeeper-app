# Honey Traceability Module

Track honey from hive to jar with EU-compliant lot numbers.

## Overview

The Honey Traceability module enables beekeepers to:
- Track bulk honey that holds extracted honey from multiple harvests
- Link harvests to bulk honey for origin tracking
- Create bottling batches with auto-generated EU lot codes
- Calculate origin percentages for multi-apiary honey blends

## Access

Navigate to **Dashboard → Traceability** in the sidebar.

## Features

### Bulk Honey

Bulk honey represents physical storage vessels (buckets, tanks, drums) that hold extracted honey before bottling.

**Fields:**
- **Container Code** - Unique identifier (e.g., "Bucket-01", "Tank-A")
- **Container Type** - bucket, tank, drum, or other
- **Extraction Date** - When honey was extracted into this container
- **Total Weight (kg)** - Optional weight of honey in container
- **Moisture Content (%)** - Optional moisture reading for quality control
- **Exclude from Batches** - Dropdown to mark containers that should not be used for bottling batches: "Given Away", "Sold Wholesale", "Personal Use", or "Other" (with free-text note). Excluded containers are hidden from the batch source selection. The container list defaults to showing only available containers, with a filter to switch between Available / Excluded / All
- **Notes** - Optional notes
- **Linked Harvests** - Select which harvest records contributed to this bulk honey

**Multi-Bucket Creation:**
When creating new bulk honey, you can specify a **Number of Buckets** (default 1). When set to more than 1, the system creates multiple containers with sequenced codes — e.g., entering code "BH-01" with 3 buckets creates "BH-01-1", "BH-01-2", "BH-01-3". All containers share the same extraction date, type, moisture content, notes, and linked harvests. Weight is left blank so you can record the actual weight per bucket afterwards.

**Origin Tracking:**
When you link harvests from different apiaries, the system automatically calculates origin percentages based on harvest weights (e.g., "60% Cork, 40% Kerry").

### Bottling Batches

Batches represent a production run of jarred honey from one or more bulk honey sources.

**Fields:**
- **Batch Code** - Auto-generated EU lot number (format: L-YYYY-MM-NNN)
- **Batch Date** - Date of bottling
- **Best Before Date** - Defaults to 2 years from batch date
- **Jar Sizes** - One or more jar sizes per batch. Each row has its own Jar Size (ml), Net Weight (g, for EU compliance) and Jar Count. Use **+ Add jar size** to fill a single batch into multiple jar sizes; remove a row with the bin icon (at least one row is always kept)
- **Total Weight (kg)** - Auto-tallied from the selected bulk honey sources (sum of the linked containers' weights); can be overridden. Recalculates whenever the source selection changes
- **Creamed** - Whether the honey has been stirred creamy
- **Public** - Whether consumers can look up this batch
- **Notes** - Optional notes
- **Bulk Honey Source** - Select which bulk honey was used

**Batch Card Summary:**
Each batch card in the Batches list shows two weight figures side by side:

| Line | Meaning |
|------|---------|
| **Total** | Raw honey that went *into* the batch — the `total_weight_kg` tallied from the linked bulk honey containers |
| **Bottled** | Honey already jarred *out of* the batch — Σ(net weight × jar count) across the jar rows, shown in kg with the total jar count |

The Bottled figure is derived on the client from the batch's jar rows (no extra query, no stored column), falling back to the legacy `jar_weight_g` × `jar_count` columns for batches with no `batch_jars` rows. It is hidden when no jar row carries both a net weight and a count. The gap between Total and Bottled is the honey from that batch not yet in jars. The batch form shows the same figure live as **Proposed bottled output** while jar rows are being edited.

The batch date is labelled **Bottled On** to distinguish it from the Bottled weight.

**Multiple Jar Sizes:**
Jar sizes are stored in the `batch_jars` table (one row per size). The public trace page lists each size's net weight and count. For backward compatibility the `batch_runs` table keeps its legacy `jar_size_ml`, `jar_weight_g` and `jar_count` columns populated from the first jar size, with `jar_count` holding the total across all sizes.

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
2. **Create Bulk Honey** - Create a bulk honey entry and link harvests to it
3. **Create Batch** - When bottling, create a batch from one or more bulk honey sources
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
| is_creamed | BOOLEAN | Whether honey is creamed |
| show_apiary_image | BOOLEAN | Show apiary photo on public page |
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

**batch_jars** (one row per jar size in a batch)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| batch_id | UUID | FK → batch_runs (ON DELETE CASCADE) |
| jar_size_ml | INTEGER | Jar size in ml |
| jar_weight_g | INTEGER | Net weight per jar in grams |
| jar_count | INTEGER | Number of jars of this size |

**batch_feedback**
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| batch_id | UUID | FK → batch_runs |
| rating | INTEGER | 1-5 star rating |
| comment | TEXT | Optional feedback comment |
| created_at | TIMESTAMPTZ | When submitted |

### Row Level Security

- Users can only access their own bulk honey and batches
- Public batches can be viewed by anyone (for future consumer lookup feature)

## Files

| File | Description |
|------|-------------|
| `src/app/dashboard/traceability/page.tsx` | Main page with Bulk Honey and Batches tabs |
| `src/app/(trace)/trace/[batchCode]/page.tsx` | Public consumer batch lookup page |
| `src/app/(trace)/layout.tsx` | Trust-focused layout for public trace page |
| `src/components/tools/TraceabilityTool.tsx` | Main traceability tool component |
| `src/types/traceability.ts` | TypeScript type definitions |
| `src/lib/batch-code.ts` | Batch code generation utilities |
| `src/lib/traceability-utils.ts` | Origin calculation utilities |
| `src/lib/story-templates.ts` | Story template definitions and placeholder logic |
| `src/components/trace/FeedbackForm.tsx` | Consumer feedback form with star rating |
| Database: `get_public_batch_info()` | RPC function for public batch lookup |
| Database: `submit_batch_feedback()` | RPC function for submitting feedback |

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
- `[Apiary Name]` - From linked bulk honey
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

The trace page uses a trust-focused design for consumer verification. It has its own minimal layout without HiveCraic branding - consumers scanning a QR code don't need to know about the app, they just want to verify their honey.

**Header:**
- Shield icon + "Honey Traceability" text (centered, no navigation links)
- Clean, trust-focused branding

**Hero Section:**
- **Title:** "Pure Irish Honey" (customizable)
- **Location:** Prominently displayed origin (e.g., "Harvested in Meath, Ireland")
- **Map:** Optional interactive map with 5km foraging radius circle (if beekeeper has enabled location sharing). Labeled "Source Apiary Foraging Area (~5km)"
- **Apiary Image:** Optional apiary photo displayed below the map (if enabled in batch settings)

**Story Section:**
- Personalized narrative: "Harvested by [Beekeeper Name] from [Apiary Name]. The bees foraged on [Floral Sources]."

**Details Section:**
- **Net Weight** - Displayed in grams (EU requirement)
- **Bottled Date** - When the honey was jarred
- **Best Before Date** - Expiry date
- **Batch Code** - De-emphasized (for reference only)

**Card Footer:**
- "Traced from hive to jar" verification badge

**Page Footer:**
- Small "Powered by HiveCraic" credit

**Feedback Section:**
- 5-star rating selector (required)
- Optional comment field (max 500 chars)
- Submit button
- Shows thank you message after submission
- Uses localStorage to prevent duplicate submissions

## Beekeeper Feedback View

Beekeepers can view customer feedback on their batches in the Traceability tool.

### Batch Card Display
- Shows average rating (star icon + number) and review count
- Only appears when feedback exists for that batch

### Feedback Modal
Click the feedback icon (speech bubble) on a batch card to open a modal showing:
- Average rating summary
- List of all reviews with:
  - Star rating (1-5)
  - Comment (if provided)
  - Submission date

### Database Functions
- `get_batch_feedback_summary(user_id)` - Returns count and average for all user's batches
- `get_batch_feedback_details(batch_id, user_id)` - Returns detailed feedback for a specific batch
- `replace_batch_links(batch_id, container_ids[], jars jsonb)` - Atomically replaces a batch's container links **and** jar rows in a single transaction, so an edit can never leave the batch half-written if a step fails. Used by both create and edit. `SECURITY DEFINER` with an explicit `auth.uid()` ownership check; EXECUTE granted to `authenticated` only.
- `replace_container_harvests(container_id, harvest_ids[])` - Atomically replaces a bulk container's harvest links in a single transaction. Same ownership/grant model as above.

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

#### Per-Jar-Size QR Codes

When a batch has **two or more jar sizes** (each with a net weight), the QR modal and the edit-form trace box render **one QR per jar size**. Each links to `/trace/{trace_code}?w={net_weight_g}` and the public page then shows **only that jar's net weight** as the hero figure, so a consumer scanning a 227 g jar isn't shown the 454 g figure too.

The deep-link is keyed on the **net weight in grams**, not the jar row id — editing a batch re-creates its `batch_jars` rows (the transactional `replace_batch_links` does delete+insert), so jar ids are not stable across edits, whereas net weight is the durable, consumer-meaningful key. Scanning with no `w` (or a non-matching value) shows all sizes as before.

### QR Code Preview (Edit Form)

When editing an existing public batch, a QR code preview is shown at the top of the form:
- Small QR code thumbnail
- Clickable trace URL that opens in a new window for preview
- Allows you to quickly verify how the public page looks before saving changes

## Future Enhancements
- **PDF Label Export** - Export printable labels with batch info
- **External Honey Blending** - Track imported honey with manual country-of-origin
- **Offline Mode** - Queue harvests when offline

## Related Documentation

- [Printable Labels](./print-labels.md) — opt-in thermal printing for balkani (bulk container) labels via Brother QL-820NWB.

## Changelog

### January 25, 2026
- Added optional apiary image display on public trace page (shown below the map when enabled)
- Added `show_apiary_image` field to batch_runs table
- Batch edit form shows apiary image preview with checkbox to enable on public page
- Added consumer feedback feature on public trace page (5-star rating + optional comment)
- Created `batch_feedback` table and `submit_batch_feedback()` RPC function
- Added beekeeper feedback view in Traceability tool (batch cards show rating + review count)
- Added feedback detail modal with full review list
- Created `get_batch_feedback_summary()` and `get_batch_feedback_details()` RPC functions

### January 24, 2026
- Added `is_creamed` field to batch_runs to track creamed (stirred creamy) honey
- Renamed "Containers" to "Bulk Honey" throughout the UI for clarity
- Redesigned public trace page with trust-focused layout (no HiveCraic branding)
- Added shield icon + "Honey Traceability" header for consumer trust
- Removed login links from public pages
- Moved trace page to separate route group for isolated layout
- Added QR code preview with clickable link on batch edit form (opens trace page in new window)
- Added visual highlighting for story templates: auto-filled values in green, unfilled placeholders in red
- Added save validation: blocks saving if unfilled `[placeholders]` remain with error toast
- Added legend explaining color coding (Auto-filled / Needs input)
- Changed map label to "Source Apiary Foraging Area (~5km)"
- Fixed origin headline to not assume "Co." prefix (location name used as-is)
- Fixed duplicate floral source bug when only one source exists

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
