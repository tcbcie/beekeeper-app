# Queen Rearing System

## Overview

The queen rearing system is the most complex feature in HiveCraic, spanning batch planning, individual graft tracking, mating nuc management, breeder queen selection, queen genealogy, and automated notifications. It covers the full lifecycle from selecting a breeder queen through to mated queen deployment.

## Routes

| Route | Page | Purpose |
|-------|------|---------|
| `/dashboard/batches` | Batches page | Seven-tab hub: Grafting Batch, Nuc Setup, Manage Nucs, Queen Tracker, Selection, Planning, Reports |
| `/dashboard/queens` | Queens list | Queen registry with genealogy, search, CSV export |
| `/dashboard/queens/[id]` | Queen detail | Profile, lineage tree, offspring, sighting history |

The batches page stays on a single route and switches tabs client-side.
The active tab is mirrored to the `?tab=` query parameter so deep links, refreshes, and browser navigation reopen the same view. Invalid tab ids fall back to `grafting`.

---

## Database Schema

### Tables

**`rearing_batches`** — batch lifecycle
- `id`, `user_id`, `batch_name`, `graft_date`
- `mother_queen_id` (FK → queens), `starter_colony_hive_id` (FK → hives)
- `cell_count`, `frame_rows`, `cells_per_row` (cell_count auto-calculated as rows × cells per row)
- `grafts_accepted`, `queens_hatched`, `queens_mated`, `queens_hybridised`
- Auto-calculated dates: `acceptance_check_date` (+1d), `first_option_to_cage_date` (+5d), `second_option_to_cage_date` (+10d), `emergence_date` (+12d)
- Notification flags: `enable_browser_notifications`, `enable_email_digest`, `enable_batch_event_reminders`, `batch_reminder_minutes_before`
- `status`, `notes`, `created_by`, `created_at`, `updated_at`

**`batch_grafts`** — individual cell tracking
- `id`, `batch_id` (FK, CASCADE), `user_id` (FK, CASCADE)
- `cell_number` (UNIQUE per batch), `status`, `notes`
- `status_date` (DATE, nullable) — date the status was last changed (auto-set to today on single-row status changes, editable for backdating; frame bulk mode can apply an explicit chosen date when saving)
- `queen_marked` (BOOLEAN, default false) — whether the queen has been marked
- `queen_number` (TEXT, nullable) — queen identification number
- Status values: `grafted` → `accepted` → `caged` → `emerged` → `in_nuc` → `mated` | `failed` | `sold`
- **Frame view**: shows grafts with status `grafted` or `accepted` only (active early-lifecycle cells). Collapsible via a "Cell Frame ▼/▲" toggle; auto-collapses on page load when any grafts are already in the queen tracking table
- **Queen tracking table**: shows grafts with status `caged`, `emerged`, `in_nuc`, `mated`, `failed`, or `sold` (i.e. everything that has progressed past the frame stage). Rows with status `sold` (distributed) or `failed` are automatically locked with a badge ("Distributed" or "Failed") and can be toggled unlocked for correction

**`graft_distributions`** — distribution tracking (see [batch-distributions.md](./batch-distributions.md))
- One distribution per graft (UNIQUE on graft_id)
- Records recipient, type, destination apiary/hive, mating confirmation, and mating confirmed date
- Auto-populates NIHBS report external distribution counts

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

**Grafting Batch Tab**
- Batch CRUD form with auto-calculated timeline dates from graft date
- Breeder queen dropdown (active queens only)
- Starter colony picker (apiary → hive cascade)
- Frame layout inputs: Rows and Cells per Row steppers (total grafts auto-calculated)
- Quantity counters with increment/decrement: accepted, hatched, mated, hybridised offspring
- Notification preferences (browser, email digest, event reminders)
- Integrates `BatchGraftsSection` for existing batches
- Mobile card view / desktop table view

**Nuc Setup Tab** - renders `MatingNucsTab` component (see below)

**Manage Nucs Tab** - renders `ManageNucsTab` component
- Dedicated view for managing active and retired mating nucs outside the setup flow

**Queen Tracker Tab** - renders `QueenTrackerTab` component
- Tracks distributed queens from rearing-group batches
- Supports group, year, and status filters
- Allows overwintering and hybridisation tracking updates

**Selection Tab** - breeder queen ranking
- Filters: apiary, time period (current year / 6m / 1y / all / custom range)
- Weighted scoring (1-5) for: brood pattern, population, temperament, swarming (inverted), honey yield
- Optional criteria: calmness, recapping, VSH, SMR, chalkbrood (inverted)
- Minimum 3 inspections required per hive
- Results ranked with medals for top 3

**Planning Tab** - renders `QueenRearingPlanningTab` component
- Local planning sandbox with no database writes
- Lets the user plan from either a graft date or a target virgin emergence day, then inspect the weekday impact across key queen milestones
- Shows virgin emergence, likely mating-flight window, likely laying window, and linked drone timing
- Surfaces assumptions directly in the UI so the timing ranges remain easy to adjust later

**Reports Tab** - renders `NucReportsTab` component
- Reporting view for mating nucs and related rearing outputs
### Reusable Components

| Component | File | Purpose |
|-----------|------|---------|
| `BatchGraftsSection` | `src/components/batches/BatchGraftsSection.tsx` | Split view: collapsible frame visualisation for grafted/accepted grafts (bars + cups) with staged bulk actions + queen tracking table for all post-frame grafts (caged/emerged/in_nuc/mated/failed/sold) with bulk actions (status change, mark/unmark, distribute, delete), queen marking, queen numbering, marking colour note, and individual distribute/delete actions. Per-row distribute and delete buttons are hidden when 2+ grafts are selected (multi-select uses the bulk action bar instead). In frame bulk mode, status/date selections are staged and saved only when `Done` is clicked, and the bulk date picker is pre-populated with the current date. Failed and distributed rows are auto-locked with a red "Failed" or indigo "Distributed" badge; lock can be toggled for correction. The batch-grafts shell, frame controls, table rows, distribution cards, and shared status chips are aligned with the application dark theme so this area no longer falls back to pale light-mode surfaces |
| `MatingNucsTab` | `src/components/batches/MatingNucsTab.tsx` | Full nuc CRUD, retirement with history, expandable inspections |
| `ManageNucsTab` | `src/components/batches/ManageNucsTab.tsx` | Equipment-focused mating nuc register with QR code assignment, inspections, and inventory state management |
| `QueenTrackerTab` | `src/components/batches/QueenTrackerTab.tsx` | Tracks distributed queens across rearing groups with status filters and follow-up fields |
| `QueenRearingPlanningTab` | `src/components/batches/QueenRearingPlanningTab.tsx` | Local queen and drone timeline planner driven by either a graft date or a target emergence day, with weekday-aware date ranges |
| `NucReportsTab` | `src/components/batches/NucReportsTab.tsx` | Read-only rearing reports for mating nuc utilisation and related outputs |
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

The Planning tab extends this with local guidance windows rather than saved batch dates:
- The planner can be anchored from either a graft date or a target virgin emergence day; whichever counterpart date is not chosen is derived automatically
- The desktop planning shell is presented as a dark surfaced module with a non-stretching control panel, stronger hierarchy, and snapshot cards that use restrained accent rails instead of pale pastel fills
- The supporting timeline cards below reuse the same surfaced accent system so the full planner reads coherently in dark mode rather than splitting into different visual languages
- The snapshot `From` and `Until` date blocks now use an auto-fit layout so they stack before overlap can happen at intermediate desktop widths
- Likely mating flights: emergence + 5 to 8 days
- Likely laying: emergence + 10 to 14 days
- Drone planning: start drone brood about 36 days before the first likely mating flight, with drone emergence around 24 days later and maturity about 10 to 12 days after that

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
- Fetches the queen record plus batch relation, then resolves mother and father directly from the stored ids
- Resets assigned hive, offspring, and inspection sightings before applying a new queen response so stale detail state is not reused across navigation
- Ignores stale async responses if a newer queen fetch starts before the previous one completes
- Returns: `queen`, `hive`, `offspring`, `sightings`, `loading`, `isOwner`, `fetchQueenData`

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
7. **Genealogy** — self-referencing mother/father FKs with direct parent lookups, duplicate-branch warnings, and request guards for rapid navigation
8. **Team visibility** — queens visible across shared apiaries via team membership
9. **Frame visualisation** — grafts rendered as a physical grafting frame with horizontal bars and hanging cell cups, coloured by status. Frame layout defined by `frame_rows` × `cells_per_row`. Horizontally scrollable on mobile. Frame shows only `grafted`/`accepted` grafts with bulk select/status/delete actions; status and date are staged and committed together on `Done`, and the bulk date picker defaults to the current date when bulk mode is opened. It is collapsible via a toggle and auto-collapses on load when any grafts have progressed to the queen tracking table. Post-frame grafts (including `failed`) appear in a separate queen tracking table below with its own bulk action bar (status change, mark all/unmark all, distribute, delete), queen marking checkbox, queen number input, and individual distribute/delete actions. Rows in `sold` or `failed` status are auto-locked and show a coloured badge; the lock can be toggled to allow corrections
10. **Marking colour display** — when a batch has an emergence date, the queen tracking table shows an info line with the international marking colour (White/Yellow/Red/Green/Blue) and a colour swatch dot, derived from the emergence year via `getQueenColorFromYear()`

---

## Files Index

| File | Purpose |
|------|---------|
| `src/app/dashboard/batches/page.tsx` | Main batches page (Grafting Batch, Nuc Setup, Manage Nucs, Queen Tracker, Selection, Planning, Reports tabs) |
| `src/app/dashboard/queens/page.tsx` | Queens list with CRUD and CSV export |
| `src/app/dashboard/queens/[id]/page.tsx` | Queen detail with lineage and sightings |
| `src/components/batches/BatchGraftsSection.tsx` | Frame visualisation of grafts (bars + cups) + distribution list |
| `src/components/batches/MatingNucsTab.tsx` | Mating nuc CRUD with retirement system + distribute button |
| `src/components/batches/DistributeGraftModal.tsx` | Distribution form modal |
| `src/hooks/useGraftDistributions.ts` | Distribution CRUD hook + search functions |
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

## NIHBS Report — Month Attribution Logic

The NIHBS monthly report (`useNIHBSReport` hook) attributes batch metrics to the calendar month when the event actually occurred, not blindly to the graft month.

| Metric | Attributed to month of | Date source |
|--------|----------------------|-------------|
| `batch_count` | Grafting | `graft_date` |
| `cell_count` | Grafting | `graft_date` |
| `grafts_accepted` | Grafting | `graft_date` |
| `queens_hatched` | Emergence | `emergence_date` (fallback: `graft_date` + 12 days) |
| `queens_mated` | Emergence | `emergence_date` (fallback: `graft_date` + 12 days) |
| `queens_hybridised` | Emergence | `emergence_date` (fallback: `graft_date` + 12 days) |

**Example:** A batch grafted on 24-Jan-2026 has an emergence date of 05-Feb-2026. Grafts and cells appear in the January report; hatched, mated, and hybridised queens appear in the February report.

A single batch may therefore contribute data to two different monthly buckets. Per-apiary breakdowns follow the same split.

**Year boundary handling:** If a batch's emergence date falls in the following year (e.g. graft in December, emergence in January), the post-emergence metrics are excluded from the current year's report to prevent misattribution. They will need to be accounted for in the next year's report.

> **Temporary:** `queens_mated` and `queens_hybridised` currently use the emergence date month as a proxy because there is no explicit mating or hybridisation date stored on the batch. This needs to be revisited — ideally these should be attributed to the month when mating was actually confirmed or when hybridised offspring were observed.

### Hatched / Mated Counter Derivation

`queens_hatched` and `queens_mated` are derived from individual grafts, not from the batch-level columns. A graft counts as **hatched** when its status is `emerged`/`mated`, when it was sold as a virgin/mated queen, or when its linked `mating_nucs` row has a `queen_emerged_at` or `mating_confirmed_at` timestamp set by an inspection. The status `in_nuc` is **not** a hatched signal on its own — the bulk-setup flow sets that status on sealed cells the moment they are transferred into a nuc, before any queen has actually emerged. Hatching is recognised once a nuc inspection records `queen_status = 'virgin'` / `'mated'` / `'laying'`, which both auto-promotes the graft status and stamps the nuc.

The same rule applies in `useRearingGroupReport` and to the persisted `rearing_batches.queens_hatched` / `queens_mated` counters written by `useBatchGrafts`.

---

## Related Documentation

- [Mating Nucs](./mating-nucs.md) — detailed mating nuc feature docs with schema DDL and verification checklist
- [Batch Distributions](./batch-distributions.md) — distribution tracking for grafts with NIHBS report integration
