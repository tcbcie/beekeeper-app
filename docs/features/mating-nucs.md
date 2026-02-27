# Mating Nucs Feature

## Overview
Track mating nucs through the queen rearing process. Each nuc receives a queen cell from a batch, is placed at a mating location, and can be inspected to track queen development (`virgin -> mating -> laying`). Nucs can be retired and reused across seasons with full history tracking. The feature also supports bulk creation for numbered and unnumbered nuc workflows while storing each nuc as an individual row.

## Feature Location
- **UI**: Dashboard > Queen Rearing (Batches) > "Mating Nucs" tab
- **Route**: `/dashboard/batches?tab=nucs`

## Data Flow
```text
Batch (graft date, breeder queen)
  -> Grafts/Cells (cell_number, status)
    -> Mating Nuc (single row per nuc)
      -> Nuc Inspections (queen status, eggs, notes)
```

---

## Implemented Features

### Core Mating Nucs
- Create/edit mating nucs with nuc number, batch, cell, location, and status
- Link nuc to specific batch and graft/cell
- `Cell/Graft` dropdown only lists `sealed` cells from the selected batch
- Track nuc through statuses: `setup`, `cell_introduced`, `virgin`, `mating`, `laying`, `failed`, `sold`, `merged`
- Auto-update nuc status based on inspection queen status

### "Grafted from" Queen Selection
- Optional dropdown to select which queen the cells were grafted from
- When a batch is selected in the create/edit form, this field auto-populates with that batch's breeder queen (`mother_queen_id`)
- Displays queen number in nuc list

### Bulk Mating Nuc Creation
- Dedicated bulk workflow on the Mating Nucs page
- Two modes:
  - **Numbered mode**: user enters multiple nuc numbers in one action
  - **Unnumbered mode**: user creates one nuc per selected sealed cell without manual numbering
- Sealed-cell allocation uses available `sealed` grafts from the selected source batch
- Cell picker supports search, select filtered, and clear selection
- Each created nuc is still inserted as an individual `mating_nucs` row
- Bulk run metadata is saved in `mating_nuc_batches`
- Bulk runs table supports filtering the nuc list by run

### Inspection System
- Expandable inspection panel with inline add/edit
- Inspection cards with badges for queen status, eggs, larvae, population, and temperament
- Auto-updates nuc status when queen status indicates laying or failure

### Retirement and History
- Duplicate active nuc numbers are blocked
- Nucs are retired (archived) rather than deleted
- "Show Retired" toggle for archive visibility
- History modal for nuc-number cycles

---

## Database Schema

### `mating_nucs`
Key columns used by this feature:
- `id` (uuid, pk)
- `user_id` (uuid, fk)
- `nuc_number` (text)
- `reference_code` (text, nullable)
- `creation_batch_id` (uuid, fk to `mating_nuc_batches`, nullable)
- `batch_id` (uuid, fk)
- `graft_id` (uuid, fk)
- `queen_id` (uuid, fk)
- `mating_location` (text)
- `status` (text)
- `retired_at` (timestamptz, nullable)

Indexes:
- active nuc lookup by user/number
- `creation_batch_id` index for bulk run filtering
- unique per-user `reference_code` when present

### `mating_nuc_batches`
Bulk run metadata:
- `id` (uuid, pk)
- `user_id` (uuid, fk)
- `source_rearing_batch_id` (uuid, fk)
- `mode` (`numbered` or `unnumbered`)
- `requested_count` (int)
- `created_count` (int)
- `notes` (text)
- `created_at`, `updated_at` (timestamptz)

RLS:
- User can select/insert/update/delete only own rows (`user_id = auth.uid()`)

### `batch_grafts`
Used for cell eligibility:
- source batch filter
- sealed status filter (`status = 'sealed'`)
- assigned-cell exclusion (already linked to active nucs)

---

## UI Components

### `src/components/batches/MatingNucsTab.tsx`
- Single-nuc create/edit form
- Bulk create form (numbered and unnumbered modes)
- Sealed-cell picker for bulk workflows
- Bulk runs summary table with run-level list filtering
- Nuc list, actions, and expandable inspections

### `src/hooks/useMatingNucBulk.ts`
- Fetches bulk run rows
- Fetches available sealed cells for selected source batch
- Validates and creates bulk nuc runs
- Inserts per-nuc records and updates graft status to `in_nuc` for assigned cells

---

## User Flows

### Single Nuc
1. Open New Nuc
2. Optionally select batch and sealed cell
3. Save one nuc row

### Numbered Bulk
1. Open Bulk Nucs
2. Select source batch
3. Choose Numbered mode
4. Enter nuc numbers
5. Auto-assign cells or manually select cells
6. Create bulk run

### Unnumbered Bulk
1. Open Bulk Nucs
2. Select source batch
3. Choose Unnumbered mode
4. Select sealed cells
5. Create bulk run
6. System assigns per-row reference identifiers

---

## Files

| File | Purpose |
|------|---------|
| `src/components/batches/MatingNucsTab.tsx` | Main mating nucs component |
| `src/hooks/useMatingNucBulk.ts` | Bulk creation and run retrieval logic |
| `src/components/batches/NucInspectionPanel.tsx` | Inspection panel |
| `src/components/batches/NucInspectionCard.tsx` | Inspection card display |
| `supabase/migrations/add_mating_nuc_bulk_batches.sql` | Bulk schema and RLS policies |

---

## Verification Checklist

- [x] Single nuc creation still works
- [x] Batch selection auto-populates "Grafted from" queen
- [x] Single-nuc cell dropdown only shows sealed cells
- [x] Numbered bulk creation creates one row per entered nuc number
- [x] Unnumbered bulk creation creates one row per selected sealed cell
- [x] Assigned grafts are updated to `in_nuc`
- [x] Bulk runs table lists run mode and counts
- [x] "View Nucs" filters list by selected run
