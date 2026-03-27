# Task: Key Events — Chart Overlay + Records Integration
**Date:** 27/03/2026
**Status:** In Progress

## Objective
Allow beekeepers to record key seasonal events with a hybrid approach: quick-add inline on chart pages + full management in Records.

## Plan

### 1. Database
- [x] Seed `key_event_type` dropdown category with values
- [x] Create `key_events` table with RLS policies
- [x] Add `key_events` to database export list

### 2. Shared Overlay Component
- [x] Create `src/components/research/KeyEventsOverlay.tsx`
  - [x] Events toggle button
  - [x] Fetch events for selected apiary + years
  - [x] Build Chart.js vertical line annotations
  - [x] Inline quick-add form: date picker, event type dropdown, notes
  - [x] Event list with delete action

### 3. Integrate into Foraging Hours Tab
- [x] Add events toggle + overlay annotations to accumulation chart

### 4. Integrate into GDD Data Tab
- [x] Add events toggle + overlay annotations to accumulation chart

### 5. Records Page Integration
- [ ] Add `KeyEvent` interface and `'key_event'` to RecordType (deferred — separate task)

### 6. Documentation
- [x] Feature plan in `docs/features/key-events.md`

## Files Affected
- Database: `key_events` table, `key_event_type` dropdown category
- `src/components/research/KeyEventsOverlay.tsx` (new)
- `src/components/research/GDDDataTab.tsx` (modify)
- `src/components/research/ForagingHoursTab.tsx` (modify)
- `src/lib/database-export.ts` (modify)

## Review
- New `key_events` table with full RLS (user CRUD own records), indexed on user_id, apiary_id, year
- `key_event_type` dropdown category seeded with 11 event types
- `KeyEventsOverlay` is a shared component returning annotations + JSX panel; called as a function (not rendered as JSX) to allow chart options to consume annotations
- Both GDD and Foraging Hours accumulation charts gain an "Events" toggle that shows vertical dashed lines at event dates, colour-matched to the year
- Inline quick-add form + event list appear below the chart when toggle is active
- Records page integration deferred to a separate task
