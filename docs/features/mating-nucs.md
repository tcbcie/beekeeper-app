# Mating Nucs Feature

## Overview
Track mating nucs through the queen rearing process. Each nuc receives a queen cell from a batch, is placed at a mating location, and can be inspected to track queen development (virgin → mated → laying).

## Feature Location
- **UI**: Dashboard > Queen Rearing (Batches) > New "Mating Nucs" tab (between Planning and Selection)
- **Route**: `/dashboard/batches?tab=nucs`

## Data Flow
```
Batch (graft date, mother queen)
    └── Grafts/Cells (cell_number, status)
            └── Mating Nuc (nuc_number, location, timestamps)
                    └── Nuc Inspections (queen status, eggs, notes)
```

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

CREATE INDEX idx_batch_grafts_batch_id ON public.batch_grafts(batch_id);
CREATE INDEX idx_batch_grafts_user_id ON public.batch_grafts(user_id);
```

### 2. `mating_nucs` - Mating nuc tracking
```sql
CREATE TABLE public.mating_nucs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nuc_number text NOT NULL,
    graft_id uuid REFERENCES batch_grafts(id) ON DELETE SET NULL,
    batch_id uuid REFERENCES rearing_batches(id) ON DELETE SET NULL,
    mating_location text,
    status text NOT NULL DEFAULT 'setup',

    -- Timestamps
    setup_date timestamptz DEFAULT now(),
    cell_introduced_at timestamptz,
    queen_emerged_at timestamptz,
    mating_confirmed_at timestamptz,

    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    CONSTRAINT mating_nucs_status_check CHECK (
        status IN ('setup', 'cell_introduced', 'virgin', 'mating', 'laying', 'failed', 'sold', 'merged')
    )
);

CREATE INDEX idx_mating_nucs_user_id ON public.mating_nucs(user_id);
CREATE INDEX idx_mating_nucs_batch_id ON public.mating_nucs(batch_id);
CREATE INDEX idx_mating_nucs_graft_id ON public.mating_nucs(graft_id);
CREATE INDEX idx_mating_nucs_status ON public.mating_nucs(status);
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

CREATE INDEX idx_nuc_inspections_nuc_id ON public.mating_nuc_inspections(nuc_id);
CREATE INDEX idx_nuc_inspections_user_id ON public.mating_nuc_inspections(user_id);
```

### 4. RLS Policies (for all three tables)
```sql
-- batch_grafts
ALTER TABLE public.batch_grafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own grafts" ON public.batch_grafts
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- mating_nucs
ALTER TABLE public.mating_nucs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own nucs" ON public.mating_nucs
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- mating_nuc_inspections
ALTER TABLE public.mating_nuc_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own nuc inspections" ON public.mating_nuc_inspections
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

---

## UI Components

### Phase 1: Add Mating Nucs Tab to Batches Page

**File**: `src/app/dashboard/batches/page.tsx`

Add third tab "Mating Nucs" between Planning and Selection:
- Tab navigation: Planning | **Mating Nucs** | Selection
- List view of all mating nucs with status indicators
- Quick filters: by batch, by status, by location
- Create/Edit nuc modal

### Phase 2: Mating Nucs List Component

**File**: `src/components/batches/MatingNucsList.tsx`

Features:
- Table/card view (responsive)
- Columns: Nuc #, Batch, Cell #, Location, Status, Last Inspection, Actions
- Status badges with colors
- Quick status update buttons
- Link to add inspection

### Phase 3: Mating Nuc Form Component

**File**: `src/components/batches/MatingNucForm.tsx`

Fields:
- Nuc number (text, required)
- Batch selection (dropdown)
- Cell/Graft selection (dropdown, filtered by batch)
- Mating location (text)
- Status (dropdown)
- Timestamps (auto-populated based on status changes)
- Notes

### Phase 4: Nuc Inspection Form Component

**File**: `src/components/batches/NucInspectionForm.tsx`

Fields:
- Inspection date (date picker, default today)
- Queen seen (checkbox)
- Queen status (dropdown: virgin/mated/laying/missing/dead)
- Eggs present (checkbox)
- Larvae present (checkbox)
- Population (dropdown: strong/moderate/weak)
- Temperament (dropdown: calm/nervous/aggressive)
- Notes (textarea)

### Phase 5: Grafts Management (within batch)

**File**: `src/components/batches/BatchGraftsSection.tsx`

Add to batch detail/edit view:
- Auto-generate grafts based on cell_count
- List of grafts with status
- Quick status update buttons
- Link graft to nuc

---

## User Flow

### Creating Mating Nucs
1. User creates a batch with graft date and cell count
2. System auto-generates graft records (Cell #1, #2, etc.) OR user manually adds
3. User creates mating nuc, selects batch and cell
4. Cell status updates to "in_nuc"
5. User records mating location

### Tracking Queen Development
1. Cell introduced → status: "cell_introduced", timestamp recorded
2. Queen emerges → status: "virgin", emergence timestamp
3. Add inspections to track mating flights
4. Queen laying → status: "laying", mating confirmed timestamp
5. Or mark as "failed" if queen lost

### Inspecting Nucs
1. Navigate to Mating Nucs tab
2. Click inspection icon on nuc row
3. Fill inspection form (queen status, eggs, etc.)
4. Save - nuc status auto-updates based on queen_status

---

## Files to Create/Modify

| File | Action |
|------|--------|
| Database migration (3 tables + RLS) | Create via MCP |
| `src/app/dashboard/batches/page.tsx` | Modify - add Mating Nucs tab |
| `src/components/batches/MatingNucsList.tsx` | Create |
| `src/components/batches/MatingNucForm.tsx` | Create |
| `src/components/batches/NucInspectionForm.tsx` | Create |
| `src/components/batches/BatchGraftsSection.tsx` | Create |
| `docs/features/mating-nucs.md` | Create (this file) |

---

## Implementation Order

1. **Database**: Create all 3 tables with RLS
2. **Grafts**: Add BatchGraftsSection to batch form/view
3. **Nucs Tab**: Add tab navigation to batches page
4. **Nucs List**: Create MatingNucsList component
5. **Nuc Form**: Create MatingNucForm component
6. **Inspections**: Create NucInspectionForm component
7. **Testing**: End-to-end flow testing

---

## Verification

1. Create a batch with 10 cells
2. Verify 10 graft records created
3. Create mating nuc linked to Cell #1
4. Verify graft status updates to "in_nuc"
5. Add inspection with queen_status = "laying"
6. Verify nuc status updates
7. Test all timestamps recorded correctly
8. Test RLS - users only see own data
9. Test mobile responsiveness
