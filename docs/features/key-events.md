# Key Events — Chart Overlay + Records Integration

## Overview

Beekeepers can record key seasonal events (first frost, pollen collection start, honey supers on, varroa treatment start, queen caging, turnover observed, etc.). Events are managed via two entry points:

1. **Quick-add on chart pages** — inline form when the Events toggle is active on GDD or Foraging Hours accumulation charts
2. **Full management in Records** — events appear in the unified Records timeline alongside inspections, harvests, etc., with full edit/delete/filter support

## Data Model

### New dropdown category: `key_event_type`

Uses the existing `dropdown_categories` / `dropdown_values` mechanism. Seeded values:

- First Frost
- First Pollen Collected
- Honey Supers On
- Honey Supers Off
- Varroa Treatment Start
- Varroa Treatment End
- Queen Caging Start
- Turnover Observed
- First Swarm
- Main Flow Start
- Main Flow End

### New table: `key_events`

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | NO | PK, gen_random_uuid() |
| user_id | uuid | NO | FK → auth.users |
| apiary_id | uuid | NO | FK → apiaries |
| event_type_id | uuid | NO | FK → dropdown_values |
| event_date | date | NO | When the event occurred |
| year | integer | NO | Extracted from event_date for filtering |
| notes | text | YES | Optional notes |
| created_at | timestamptz | YES | Default now() |
| updated_at | timestamptz | YES | Default now() |

RLS: users can only read/write their own records (`user_id = auth.uid()`).

## UI — Entry Point 1: Chart Overlay (Quick-Add)

### Toggle

Both the GDD Data and Foraging Hours tabs gain a small "Events" toggle button (same style as existing Nearby Data toggle). When active:

- Events for the selected apiary and years render as **vertical dashed lines** on the accumulation chart via `chartjs-plugin-annotation`
- Line colour matches the year's colour from `YEAR_COLORS`
- Small label at the top showing the event type name
- A compact inline form appears below the chart: date picker, event type dropdown, optional notes, save button
- Quick list of events for the current apiary/years with edit and delete actions
- Clicking the pencil icon on an event pre-fills the form in edit mode; "Update" saves changes via Supabase `update`

### Annotation rendering

For each event in the selected years:
- Vertical line annotation at the event's day-of-year x-axis position
- `type: 'line'`, `scaleID: 'x'`, positioned at the nearest chart tick to the event's day-of-year
- Dashed style (`borderDash: [4, 4]`)
- Label with `rotation: 270` at the top showing event type name

## UI — Entry Point 2: Records Page (Full Management)

### Integration with existing Records

- Add `'key_event'` to the `RecordType` union
- Fetch key events in `useRecordsData` alongside inspections, harvests, etc.
- Events appear in the unified timeline sorted by date
- Record card shows: event type badge, date, apiary name, notes
- Filter by record type includes "Key Event" option
- Edit opens inline form (same fields: date, type, apiary, notes)
- Delete with confirmation

## Components

| File | Purpose |
|------|---------|
| `src/components/research/KeyEventsOverlay.tsx` | New: shared overlay — toggle, annotation builder, inline quick-add form, event list |
| `src/components/research/GDDDataTab.tsx` | Modify: integrate events toggle + pass annotations to chart |
| `src/components/research/ForagingHoursTab.tsx` | Modify: integrate events toggle + pass annotations to chart |
| `src/hooks/useRecordsData.ts` | Modify: fetch key_events alongside other records |
| `src/types/records.ts` | Modify: add KeyEvent interface, extend RecordType |
| `src/app/dashboard/records/page.tsx` | Modify: render key event cards, support edit/delete |
| Database migration | New table `key_events` + seed `key_event_type` dropdown category |

## Implementation Order

1. Database: create table + seed dropdown category
2. `KeyEventsOverlay.tsx`: shared component (fetch, annotations, quick-add)
3. Integrate into Foraging Hours tab (simpler, good test bed)
4. Integrate into GDD Data tab
5. Records page integration (RecordType, fetch, card rendering)

## Implementation Notes

- Chart.js annotation plugin is already registered in both tabs
- The overlay component exports a `useKeyEventAnnotations()` hook that returns annotation config objects ready to merge into chart options
- Events are fetched once per toggle activation, filtered client-side by selected years
- No new API routes — direct Supabase queries with RLS
- Apiary is inherited from the chart's current apiary selection
