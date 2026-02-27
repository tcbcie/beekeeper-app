# Mating Nucs Feature

## Overview
Track mating nucs through the queen rearing process. Each nuc receives a queen cell from a batch, is placed at a mating location, and can be inspected to track queen development (virgin → mated → laying). Nucs can be retired and reused across seasons with full history tracking.

## Feature Location
- **UI**: Dashboard > Queen Rearing (Batches) > "Mating Nucs" tab (between Planning and Selection)
- **Route**: `/dashboard/batches?tab=nucs`

## Data Flow
```
Batch (graft date, mother queen)
    └── Grafts/Cells (cell_number, status)
            └── Mating Nuc (nuc_number, location, timestamps)
                    └── Nuc Inspections (queen status, eggs, notes)
```

---

## Implemented Features

### Core Mating Nucs
- Create/edit mating nucs with nuc number, batch, cell, location, status
- Link nuc to specific batch and graft/cell
- Track nuc through statuses: setup → cell_introduced → virgin → mating → laying/failed/sold/merged
- Auto-update nuc status based on inspection queen status

### "Grafted from" Queen Selection
- Optional dropdown to select which queen the cells were grafted from
- When a batch is selected in the create/edit form, this field auto-populates with that batch's breeder queen (`mother_queen_id`)
- Displays queen number in nuc list
- Helps track lineage when not using batch system

### Inspection System
- Expandable inspection panel (same pattern as wild colonies)
- Inline form for adding/editing inspections
- Inspection cards with color-coded badges:
  - Queen status: virgin (purple), mated (blue), laying (green), missing (amber), dead (red)
  - Eggs present, larvae present indicators
  - Population: strong/moderate/weak
  - Temperament: calm/nervous/aggressive
- Auto-updates nuc status when queen_status is 'laying' or 'dead'/'missing'

### Inspection Count & Last Updated
- Table shows number of inspections per nuc
- Displays last updated timestamp
- Helps identify nucs needing attention

### Retirement & History System
- **Unique active nuc numbers**: Cannot create duplicate nuc numbers while one is active
- **Retire instead of delete**: Archives nuc (sets retired_at) but preserves all history
- **Show Retired toggle**: Switch between active and archived nucs view
- **History modal**: View all cycles for a nuc number with:
  - Cycle number
  - Setup and retired dates
  - Final status
  - Batch and queen info
  - Inspection count per cycle

### AI Tools
- `getMatingNucs` - List active nucs with status, queen info, inspection counts
- `getMatingNucSummary` - Summary counts by status
- `getNucDetails` - Full nuc details including all inspections
- `getNucsReadyForHarvest` - Nucs with laying queens ready for harvest
- `getNucsNeedingInspection` - Nucs not inspected within X days

### Backup Integration
- All mating nuc tables included in user data export
- All tables included in admin full database export

---

## Database Schema

### 1. `batch_grafts` - Individual cell/graft tracking
```sql
CREATE TABLE public.batch_grafts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id uuid NOT NULL REFERENCES rearing_batches(id) ON DELETE CASCADE,
    cell_number integer NOT NULL,
    status text NOT NULL DEFAULT 'grafted',
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    CONSTRAINT batch_grafts_status_check CHECK (
        status IN ('grafted', 'accepted', 'caged', 'emerged', 'in_nuc', 'mated', 'failed', 'sold')
    ),
    CONSTRAINT batch_grafts_unique_cell UNIQUE (batch_id, cell_number)
);
```

### 2. `mating_nucs` - Mating nuc tracking
```sql
CREATE TABLE public.mating_nucs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nuc_number text NOT NULL,
    graft_id uuid REFERENCES batch_grafts(id) ON DELETE SET NULL,
    batch_id uuid REFERENCES rearing_batches(id) ON DELETE SET NULL,
    queen_id uuid REFERENCES queens(id) ON DELETE SET NULL,  -- "Grafted from" queen
    mating_location text,
    status text NOT NULL DEFAULT 'setup',

    -- Timestamps
    setup_date timestamptz DEFAULT now(),
    cell_introduced_at timestamptz,
    queen_emerged_at timestamptz,
    mating_confirmed_at timestamptz,
    retired_at timestamptz,  -- NULL = active, set = retired/archived

    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    CONSTRAINT mating_nucs_status_check CHECK (
        status IN ('setup', 'cell_introduced', 'virgin', 'mating', 'laying', 'failed', 'sold', 'merged')
    )
);

-- Partial index for efficient active nuc queries
CREATE INDEX idx_mating_nucs_active ON public.mating_nucs(user_id, nuc_number)
WHERE retired_at IS NULL;
```

### 3. `mating_nuc_inspections` - Nuc inspection records
```sql
CREATE TABLE public.mating_nuc_inspections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nuc_id uuid NOT NULL REFERENCES mating_nucs(id) ON DELETE CASCADE,
    inspection_date date NOT NULL DEFAULT CURRENT_DATE,

    -- Queen status
    queen_seen boolean DEFAULT false,
    queen_status text,  -- 'virgin', 'mated', 'laying', 'missing', 'dead'
    eggs_present boolean DEFAULT false,
    larvae_present boolean DEFAULT false,

    -- Basic assessment
    population text,  -- 'strong', 'moderate', 'weak'
    temperament text, -- 'calm', 'nervous', 'aggressive'

    notes text,
    created_at timestamptz DEFAULT now(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    CONSTRAINT nuc_inspections_queen_status_check CHECK (
        queen_status IS NULL OR queen_status IN ('virgin', 'mated', 'laying', 'missing', 'dead')
    )
);
```

---

## UI Components

### MatingNucsTab (`src/components/batches/MatingNucsTab.tsx`)
Main component with:
- Header with "Show Retired" toggle and "New Nuc" button
- Create/edit form with batch, graft, queen, location, status fields
- Nuc list with expandable rows
- Action buttons: History, Edit, Retire (Archive icon)
- History modal showing all cycles for a nuc number

### NucInspectionPanel (`src/components/batches/NucInspectionPanel.tsx`)
Expandable panel (same pattern as WildColonyInspectionPanel):
- "Add Inspection" button and inline form
- List of inspection cards
- Auto-updates nuc status based on queen_status

### NucInspectionCard (`src/components/batches/NucInspectionCard.tsx`)
Card component showing:
- Date and queen status badge
- Queen seen, eggs, larvae indicators
- Population and temperament badges
- Notes section
- Edit/Delete buttons

### BatchGraftsSection (`src/components/batches/BatchGraftsSection.tsx`)
Manages individual grafts within a batch:
- Auto-generate grafts from cell count
- Grid display with status dropdowns
- Status summary counts

---

## User Flows

### Creating Mating Nucs
1. Create a batch with graft date and cell count
2. Generate graft records (Cell #1, #2, etc.)
3. Create mating nuc, optionally select batch, cell, and "Grafted from" queen
4. Cell status updates to "in_nuc"
5. Record mating location

### Tracking Queen Development
1. Cell introduced → status: "cell_introduced"
2. Queen emerges → status: "virgin"
3. Add inspections to track mating flights
4. Queen laying → status: "laying" (auto-updated from inspection)
5. Or mark as "failed" if queen lost

### Retiring and Reusing Nucs
1. When a nuc cycle is complete (queen sold, merged, or failed)
2. Click Retire (Archive icon) - nuc is archived with all history
3. Create new nuc with same number for next cycle
4. View History to compare performance across cycles

---

## Files

| File | Purpose |
|------|---------|
| `src/components/batches/MatingNucsTab.tsx` | Main mating nucs component |
| `src/components/batches/NucInspectionPanel.tsx` | Expandable inspection panel |
| `src/components/batches/NucInspectionCard.tsx` | Inspection card display |
| `src/components/batches/BatchGraftsSection.tsx` | Graft management within batch |
| `src/lib/ai/tools/nucs.ts` | AI tools for mating nucs |
| `src/app/dashboard/batches/page.tsx` | Batches page with Mating Nucs tab |

---

## Verification Checklist

- [x] Create batch with cells, verify graft records created
- [x] Create mating nuc linked to cell, verify graft status updates
- [x] Add inspection, verify nuc status auto-updates
- [x] Test "Grafted from" queen selection
- [x] Test inspection count and last updated display
- [x] Test expandable inspection panel
- [x] Test duplicate nuc number validation (should fail for active nucs)
- [x] Test retire functionality (archives, doesn't delete)
- [x] Test creating new nuc with retired number (should succeed)
- [x] Test Show Retired toggle
- [x] Test History modal shows all cycles
- [x] Test AI tools filter active nucs by default
- [x] Test backup includes all mating nuc tables
