# QR Tags — Decoupled QR Code System

## Overview

QR Tags decouple the physical QR code from a specific hive. Instead of encoding a hive UUID directly into the QR URL, a permanent tag code is used. Tags can be generated in bulk, printed, and assigned/reassigned to any hive at any time.

```
Physical Badge → QR Tag (permanent code) → Hive (reassignable)
```

## How It Works

1. **Generate tags** on the QR Tags management page (`/dashboard/qr-tags`)
2. **Print** the tags and attach them to hives
3. **Assign** each tag to a hive via the management page
4. **Scan** a tag with your phone camera — it redirects to the assigned hive's quick-record page
5. **Reassign** tags when hives change — the physical badge stays the same

## Tag Code Format

Tags use the format `HC-XXXXXX` where X is drawn from an unambiguous alphabet (no 0/O, 1/I/L confusion). This provides ~729 million unique combinations.

## Database

### `qr_tags` table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `code` | TEXT | Unique tag code (e.g. `HC-A3K9M2`) |
| `user_id` | UUID | Owner (references `auth.users`) |
| `hive_id` | UUID (nullable) | Assigned hive (references `hives`, SET NULL on delete) |
| `label` | TEXT (nullable) | Optional label for organisation |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `assigned_at` | TIMESTAMPTZ (nullable) | When the tag was last assigned |

### RLS Policies

- **SELECT**: Anyone can read tags (required for scan page to work for any visitor)
- **INSERT/UPDATE/DELETE**: Only the owning user

## Routes

| Route | Purpose |
|-------|---------|
| `/dashboard/qr-tags` | Tag management (generate, assign, delete, print) |
| `/dashboard/hive-scan/tag/[code]` | Scan landing page (looks up tag → shows hive record buttons) |

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/qr-tags.ts` | Tag code generation utility |
| `src/app/dashboard/qr-tags/page.tsx` | Management page |
| `src/app/dashboard/hive-scan/tag/[code]/page.tsx` | Scan landing page |
| `src/components/hive/HiveQRCode.tsx` | QR code display component (updated to use tag codes) |

## Hive Detail Integration

The hive detail page (`/dashboard/hives/[id]`) QR modal now:
- Shows the QR code if a tag is assigned to the hive
- Shows a "No QR tag assigned" message with a link to the QR Tags page if no tag is assigned

## Navigation

QR Tags appears in both the desktop sidebar and mobile drawer, after "Tools".
