# Queen Rearing System

## Overview

The queen rearing system is the most complex feature in HiveCraic, spanning batch planning, individual graft tracking, mating nuc management, breeder queen selection, queen genealogy, and automated notifications. It covers the full lifecycle from selecting a breeder queen through to mated queen deployment.

## Routes

| Route | Page | Purpose |
|-------|------|---------|
| `/dashboard/batches` | Batches page | Three-tab hub: Planning, Mating Nucs, Selection |
| `/dashboard/queens` | Queens list | Queen registry with genealogy, search, CSV export |
| `/dashboard/queens/[id]` | Queen detail | Profile, lineage tree, offspring, sighting history |

The batches page uses a tab query param (`?tab=nucs`, `?tab=selection`) but stays on a single route.

---

## Database Schema

### Tables

**`rearing_batches`** — batch lifecycle
- `id`, `user_id`, `batch_name`, `graft_date`
- `mother_queen_id` (FK → queens), `starter_colony_hive_id` (FK → hives)
- `cell_count`, `grafts_accepted`, `queens_hatched`, `queens_mated`
- Auto-calculated dates: `acceptance_check_date` (+1d), `first_option_to_cage_date` (+5d), `second_option_to_cage_date` (+10d), `emergence_date` (+12d)
- Notification flags: `enable_browser_notifications`, `enable_email_digest`, `enable_batch_event_reminders`, `batch_reminder_minutes_before`
- `status`, `notes`, `created_by`, `created_at`, `updated_at`

**`batch_grafts`** — individual cell tracking
- `id`, `batch_id` (FK, CASCADE), `user_id` (FK, CASCADE)
- `cell_number` (UNIQUE per batch), `status`, `notes`
- Status values: `grafted` → `accepted` → `caged` → `emerged` → `in_nuc` → `mated` | `failed` | `sold`

**`mating_nucs`** — mating nucleus colonies
- `id`, `user_id`, `nuc_number`
- `graft_id` (FK → batch_grafts, SET NULL), `batch_id` (FK, SET NULL), `queen_id` (FK, SET NULL)
- `mating_location`, `status`
- Timestamps: `setup_date`, `cell_introduced_at`, `queen_emerged_at`, `mating_confirmed_at`, `retired_at`
- Status values: `setup` → `cell_introduced` → `virgin` → `mating` → `laying` | `failed` | `sold` | `merged`
- Partial index: `idx_mating_nucs_active` on (user_id, nuc_number) WHERE retired_at IS NULL

**`mating_nuc_inspections`** — nuc health records
- `id`, `nuc_id` (FK, CASCADE), `user_id` (FK, CASCADE)
- `inspection_date`, `queen_seen`, `queen_status`, `eggs_present`, `larvae_present`
- `population` (strong/moderate/weak), `temperament` (calm/nervous/aggressive), `notes`

**`queens`** — queen registry (see also queen-specific docs)
- `mother_id`, `father_id` (self-referencing FKs for genealogy)
- `batch_id` (FK → rearing_batches) — links queen to source batch

### RLS Policies

All four rearing tables have RLS enabled. `rearing_batches` has explicit SELECT/INSERT/UPDATE/DELETE policies filtering on `user_id = auth.uid()`. The child tables (`batch_grafts`, `mating_nucs`, `mating_nuc_inspections`) filter by `user_id` in application queries.

### Triggers

**`sync_batch_dates_to_tasks()`** — AFTER INSERT OR UPDATE on `rearing_batches`
- Auto-creates events in `tasks_events` for: Acceptance Check, 1st Cage Option, 2nd Cage Option, Expected Emergence
- Category: `queen_rearing`, priority: `high` (caging) / `normal` (emergence)

**`cleanup_batch_events()`** — BEFORE DELETE on `rearing_batches`
- Removes associated events from `tasks_events`

---

## Data Flow

```
Breeder Queen Selection (hive scoring algorithm)
    │
    ▼
Rearing Batch (graft_date, mother_queen_id, starter_colony_hive_id)
    │
    ├── Batch Grafts (cell_number, status progression)
    │       │
    │       ▼
    │   Mating Nuc (nuc_number, location, timestamps)
    │       │
    │       ▼
    │   Nuc Inspections (queen_status, eggs, larvae)
    │
    ▼
Queen Record (queen_number, lineage, batch_id)
    │
    ├── Assigned to Hive
    ├── Mother/Father genealogy
    └── Offspring tracking
```

---

## Components

### Batches Page (`src/app/dashboard/batches/page.tsx`)

**Planning Tab**
- Batch CRUD form with auto-calculated timeline dates from graft date
- Breeder queen dropdown (active queens only)
- Starter colony picker (apiary → hive cascade)
- Quantity counters with increment/decrement: grafts, accepted, hatched, mated
- Notification preferences (browser, email digest, event reminders)
- Integrates `BatchGraftsSection` for existing batches
- Mobile card view / desktop table view

**Mating Nucs Tab** — renders `MatingNucsTab` component (see below)

**Selection Tab** — breeder queen ranking
- Filters: apiary, time period (current year / 6m / 1y / all / custom range)
- Weighted scoring (1–5) for: brood pattern, population, temperament, swarming (inverted), honey yield
- Optional criteria: calmness, recapping, VSH, SMR, chalkbrood (inverted)
- Minimum 3 inspections required per hive
- Results ranked with medals for top 3

### Reusable Components

| Component | File | Purpose |
|-----------|------|---------|
| `BatchGraftsSection` | `src/components/batches/BatchGraftsSection.tsx` | Grid of individual grafts with status dropdowns, bulk generation, delete |
| `MatingNucsTab` | `src/components/batches/MatingNucsTab.tsx` | Full nuc CRUD, retirement with history, expandable inspections |
| `NucInspectionPanel` | `src/components/batches/NucInspectionPanel.tsx` | Inline inspection form + history list per nuc |
| `NucInspectionCard` | `src/components/batches/NucInspectionCard.tsx` | Single inspection display with badges |
| `QueenLineageTree` | `src/components/QueenLineageTree.tsx` | 4-generation family tree with colour-coded queen cards |

### Queens Pages

**Queens List** (`src/app/dashboard/queens/page.tsx`)
- Search by queen number or subspecies
- Filters: ownership (my/team/all), assignment (all/assigned/unassigned)
- Summary stats: active, retired, dead counts + average age
- Create/edit form: number, birth date, marking colour (auto from year), source, subspecies, lineage, mother/father, source batch, mated-at eircode, status, clipped, notes
- CSV export of all visible queens
- "Replace soon" badge for active queens > 2 years old
- Team queen visibility via shared apiary membership

**Queen Detail** (`src/app/dashboard/queens/[id]/page.tsx`)
- Profile card: identity, genetics (mother/father links, subspecies, lineage, batch), assignment (hive, apiary)
- Age warning alert if active and > 2 years
- Collapsible lineage tree (up to 4 generations + children + siblings)
- Offspring list with navigation links
- Sighting history timeline from hive inspections

---

## Timeline Auto-Calculation

All dates derive from the graft date, reflecting honey bee queen development biology ("3-5-8 — the queen is made"):

| Event | Offset | Purpose |
|-------|--------|---------|
| Acceptance Check | +1 day | Verify grafts accepted by starter colony |
| 1st Option to Cage | +5 days | Cage strongest cells |
| 2nd Option to Cage | +10 days | Final caging before sealing |
| Expected Emergence | +12 days | Virgin queens emerge |

---

## Notification System

### Browser Notifications (client-side)
- `scheduleBatchNotifications(batch)` in `src/lib/notifications.ts`
- Schedules day-of notifications at 8 AM for each milestone
- Uses `setTimeout` — only works while browser tab is open

### Email Digest (server-side)
- Edge function: `supabase/functions/weekly-email-digest/index.ts`
- Weekly cron job queries batches with `enable_email_digest = true`
- Sends HTML email via Resend API with upcoming events (7-day window)
- Groups by urgency (today/tomorrow/days out)

### Event Reminders
- Edge function: `supabase/functions/task-event-reminders/index.ts`
- Generic task/event reminder system
- `enable_batch_event_reminders` flag exists on batches but integration is partial

---

## AI Tools

Located in `src/lib/ai/tools/queens.ts` and `src/lib/ai/tools/nucs.ts`:

| Tool | Purpose |
|------|---------|
| `getQueenInventory` | List all queens with status, age, location |
| `getActiveBatches` | Batches currently in progress |
| `getBatchDetails` | Full batch with timeline and progress |
| `getUpcomingBatchEvents` | Events due in next 7/14/30 days |
| `getMatingNucs` | Active nucs with status and inspection counts |
| `getMatingNucSummary` | Counts by nuc status |
| `getNucDetails` | Full nuc details with all inspections |
| `getNucsReadyForHarvest` | Nucs with laying queens |
| `getNucsNeedingInspection` | Nucs not inspected within X days |

---

## Custom Hook

**`useQueenDetail`** (`src/hooks/useQueenDetail.ts`)
- Fetches queen with mother, father, batch relations via `select('*')`
- Retrieves assigned hive, offspring (daughter queens), and inspection sightings
- Returns: `apiary`, `hive`, `offspring`, `sightings`, `stats`, `loading`, `isOwner`

---

## Type Definitions

**`src/types/queen.ts`**
- `Queen` — full queen record with nested `batch`, `hive`, `mother`, `father` relations
- `QueenFormData` — form input structure
- `Batch` — `{ id, batch_name }` reference
- `getQueenColorFromYear(year)` — international marking colour standard
- `calculateQueenAge(birthDate)` — formatted age string

Component-level interfaces in `batches/page.tsx`:
- `Batch` — full batch with all timeline fields and nested queens/hives relations
- `Graft` — `{ id, batch_id, cell_number, status, notes }`
- `MatingNuc` — full nuc with nested batch_grafts, rearing_batches, queens, inspection count

---

## Key Design Patterns

1. **Auto-calculation** — timeline dates derive from graft date, marking colour from birth year
2. **Status progression** — grafts and nucs follow defined state machines
3. **Soft delete** — nucs use `retired_at` timestamp for archival, allowing nuc number reuse across seasons
4. **Cascading dropdowns** — apiary → hive, batch → graft
5. **Auto-status updates** — nuc status updates automatically from inspection queen_status (laying → laying, dead/missing → failed)
6. **Weighted scoring** — configurable multi-criteria algorithm for breeder selection
7. **Genealogy** — self-referencing mother/father FKs with recursive tree fetching (up to 4 generations)
8. **Team visibility** — queens visible across shared apiaries via team membership

---

## Files Index

| File | Purpose |
|------|---------|
| `src/app/dashboard/batches/page.tsx` | Main batches page (Planning, Nucs, Selection tabs) |
| `src/app/dashboard/queens/page.tsx` | Queens list with CRUD and CSV export |
| `src/app/dashboard/queens/[id]/page.tsx` | Queen detail with lineage and sightings |
| `src/components/batches/BatchGraftsSection.tsx` | Individual graft management grid |
| `src/components/batches/MatingNucsTab.tsx` | Mating nuc CRUD with retirement system |
| `src/components/batches/NucInspectionPanel.tsx` | Expandable nuc inspection management |
| `src/components/batches/NucInspectionCard.tsx` | Single nuc inspection card display |
| `src/components/QueenLineageTree.tsx` | Multi-generation family tree visualisation |
| `src/hooks/useQueenDetail.ts` | Queen detail data fetching hook |
| `src/types/queen.ts` | Queen and batch type definitions |
| `src/lib/ai/tools/queens.ts` | AI tools for queens and batches |
| `src/lib/ai/tools/nucs.ts` | AI tools for mating nucs |
| `src/lib/notifications.ts` | Browser notification scheduling |
| `supabase/functions/weekly-email-digest/index.ts` | Weekly email digest edge function |
| `supabase/functions/task-event-reminders/index.ts` | Event reminder edge function |
| `docs/features/mating-nucs.md` | Mating nucs feature documentation |

---

## Related Documentation

- [Mating Nucs](./mating-nucs.md) — detailed mating nuc feature docs with schema DDL and verification checklist
