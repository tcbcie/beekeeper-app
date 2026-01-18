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
- **Jar Count** - Number of jars produced
- **Total Weight (kg)** - Optional total batch weight
- **Public** - Whether consumers can look up this batch (future feature)
- **Notes** - Optional notes
- **Source Containers** - Select which containers were used

## Batch Code Format

Batch codes follow EU lot number requirements:

```
L-2026-01-001
│ │    │  │
│ │    │  └── Sequential number (001-999 per month)
│ │    └───── Month (01-12)
│ └────────── Year
└──────────── "L" prefix (EU Lot identifier)
```

The system automatically generates the next sequential number for each month.

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
| batch_code | VARCHAR(20) | Unique lot number |
| batch_date | DATE | Bottling date |
| total_weight_kg | NUMERIC | Optional total weight |
| jar_size_ml | INTEGER | Jar size in ml |
| jar_count | INTEGER | Number of jars |
| best_before_date | DATE | Best before date |
| notes | TEXT | Optional notes |
| is_public | BOOLEAN | Allow public lookup |

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
| `src/types/traceability.ts` | TypeScript type definitions |
| `src/lib/batch-code.ts` | Batch code generation utilities |
| `src/lib/traceability-utils.ts` | Origin calculation utilities |

## Future Enhancements (Phase 2+)

- **Public Consumer Page** - `/trace/[batchCode]` for "Meet Your Bees" lookup
- **QR Code Generation** - Generate QR codes for jar labels
- **PDF Label Export** - Export printable labels with batch info
- **External Honey Blending** - Track imported honey with manual country-of-origin
- **Floral Source Tracking** - Record vegetation/nectar types
- **Offline Mode** - Queue harvests when offline
