# Mating Nuc QR Codes & Equipment Management

**Date:** 2026-03-27
**Updated:** 2026-03-28
**Status:** Implemented

## Overview

Extends the existing QR tag system to support mating nucs alongside hives. Adds equipment-level status tracking for mating nucs within the Queen Rearing section.

**Value:** Beekeepers can print QR tags for physical mating nuc boxes. Scanning a tag with a mobile phone loads the nuc record with quick actions for inspections. Equipment statuses (active, ready, retired) track the physical box lifecycle independently from the queen-rearing status.

## Navigation Structure

The Queen Rearing section contains six tabs:

| Tab | Purpose |
|-----|---------|
| Grafting Batch | Create and manage rearing batches |
| **Nuc Setup** | Commission mating nucs with brood, queens, or cells |
| Selection | Breeder queen selection filters |
| Virgin Queen Tracker | Track virgin queens |
| Planning | Rearing schedule planning |
| **Manage NUCs** | Equipment inventory, QR codes, inspections |

- The "Nuc Setup" tab (formerly "Mating Nucs") handles commissioning nucs within a batch context. Users can select from existing inventory nucs or enter a nuc number freely.
- The "Manage NUCs" tab is the equipment inventory register. Users create nuc boxes here (nuc number + notes), manage equipment statuses, assign QR codes, and record inspections.

## How It Works

### QR Tag Generation
1. Navigate to **QR Tags** page
2. Click **Generate Tags**
3. Select **Tag type: Mating Nuc (MN-)** in the modal
4. Tags are generated with `MN-XXXXXX` prefix (vs `HC-XXXXXX` for hives)
5. Assign tags to mating nucs via the assign modal

### QR Scanning
1. Scan a mating nuc QR tag with a mobile phone camera
2. Opens the scan landing page at `/dashboard/hive-scan/tag/{code}`
3. Displays nuc number, equipment status, queen-rearing status, and mating location
4. Two quick actions: **View Details** and **New Inspection**

### Equipment Management (Manage NUCs)
1. Navigate to **Queen Rearing > Manage NUCs** tab
2. Click **Add Nuc** to register a new physical nuc box (nuc number, optional notes, optional QR tag)
3. New nucs are created with `is_inventory=true`, equipment status "Ready", and rearing status "Setup"
4. Only nucs created via this tab appear here (distinguished by `is_inventory` flag)
5. Filter by equipment status: All, Active, Ready, Retired
6. Expand a nuc card to:
   - Change equipment status
   - View/assign QR code
   - See setup details and rearing batch info
   - Add inspections via embedded NucInspectionPanel

### Nuc Setup Workflow
1. Navigate to **Queen Rearing > Nuc Setup** tab
2. Click **New Nuc** to commission a nuc
3. Select from existing inventory nucs via the "Select from Inventory" dropdown, or type a nuc number freely
4. Assign a batch, graft/cell, queen, mating location, and status

### Equipment Statuses
- **Active** — Nuc box is currently in use
- **Ready** — Nuc box is prepared and available for the next cycle
- **Retired** — Nuc box is no longer in use

## Architecture

### Database Changes

**`qr_tags` table — new column:**
- `mating_nuc_id uuid` — FK to `mating_nucs(id)`, ON DELETE SET NULL
- CHECK constraint: `NOT (hive_id IS NOT NULL AND mating_nuc_id IS NOT NULL)` — a tag cannot be assigned to both
- Partial unique index on `mating_nuc_id WHERE mating_nuc_id IS NOT NULL` — one tag per nuc

**`mating_nucs` table — new columns:**
- `equipment_status text NOT NULL DEFAULT 'active'`
- CHECK constraint: `equipment_status IN ('active', 'ready', 'retired')`
- `is_inventory boolean NOT NULL DEFAULT false` — distinguishes nucs registered as inventory (via Manage NUCs) from nucs created through the Nuc Setup commissioning flow

### Tag Code Format
- Hive tags: `HC-XXXXXX` (unchanged)
- Mating nuc tags: `MN-XXXXXX` (new)
- Both use the same 30-character unambiguous alphabet
- `generateTagCode(prefix)` in `src/lib/qr-tags.ts` accepts an optional prefix parameter

### Scan Page Routing
The scan landing page (`/dashboard/hive-scan/tag/[code]`) has three render branches:
1. **Hive assigned** — shows hive info + record creation buttons (unchanged)
2. **Mating nuc assigned** — shows nuc info + View Details / New Inspection buttons
3. **Unassigned** — shows tag code + link to manage QR tags

### Redirect
The old `/dashboard/mating-nucs` route redirects to `/dashboard/batches?tab=manage_nucs`, preserving any `?nuc={id}` deep-link parameter.

## Files

| File | Purpose |
|------|---------|
| `src/lib/qr-tags.ts` | Tag code generation with prefix parameter |
| `src/components/mating-nucs/NucQRCode.tsx` | QR code display with download/print for nucs |
| `src/components/batches/ManageNucsTab.tsx` | Equipment inventory tab component (QR codes, statuses, inspections) |
| `src/app/dashboard/mating-nucs/page.tsx` | Redirect to Queen Rearing Manage NUCs tab |
| `src/app/dashboard/batches/page.tsx` | Queen Rearing page (hosts Nuc Setup + Manage NUCs tabs) |
| `src/app/dashboard/hive-scan/tag/[code]/page.tsx` | Scan landing page (extended with nuc branch) |
| `src/app/dashboard/qr-tags/page.tsx` | QR tags management (extended with nuc tag support) |

## Deep-Linking

The Manage NUCs tab supports URL parameters for deep-linking from the scan page:
- `/dashboard/batches?tab=manage_nucs&nuc={id}` — auto-expands the specified nuc card

## Verification

1. Generate MN-XXXXXX tags on the QR Tags page
2. Assign a tag to a mating nuc via the assign modal
3. Open the scan URL in a browser — verify nuc info loads with 2 action buttons
4. Navigate to Queen Rearing > Manage NUCs tab — verify all nucs listed with equipment statuses
5. Change equipment status on a nuc (active/ready/retired)
6. Download and print a mating nuc QR tag
7. Test the deep-link: `/dashboard/batches?tab=manage_nucs&nuc={id}` auto-expands the card
8. Test `/dashboard/mating-nucs?nuc={id}` redirects correctly
9. Test on mobile viewport for responsive layout

## Post-Refactor Audit (28/03/2026)

A Principal Quality Architect audit identified and fixed 9 issues across severity levels:

### High (3 fixed)
- Loading spinner hang on fetch error (ManageNucsTab)
- Missing `user_id` guard on equipment status update (ManageNucsTab)
- Missing `user_id` guard on nuc delete (ManageNucsTab)

### Medium (6 fixed)
- setTimeout memory leak in auto-expand effects (ManageNucsTab + MatingNucsTab)
- `allPrintTags` and `printTags` not memoised (QR Tags page)
- Inventory dropdown bound by nuc_number instead of ID (MatingNucsTab)
- QR tag assignment failure during create silently reset form (ManageNucsTab)

### Audit Round 2 — High (2 fixed)
- Auto-expand effect re-fired on every `fetchNucs()`, stealing expansion from user after inspection saves (MatingNucsTab)
- Highlight ring not applied to nucs matched via `nuc_number` URL param (MatingNucsTab)

### Audit Round 2 — Medium (5 fixed)
- Missing `user_id` guards on update/retire/delete in MatingNucsTab (3 queries)
- Missing `user_id` guard on QR tag unassign before delete (ManageNucsTab)
- `activeTab` not synced when URL `?tab=` param changes via soft navigation (Batches page)
