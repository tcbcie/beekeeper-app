# Task: KeyEventsOverlay — Code Audit Hardening
**Date:** 27/03/2026
**Status:** Complete

## Objective
Fix all Critical/High/Medium issues identified in the Principal Quality Architect audit of `KeyEventsOverlay.tsx`.

## Plan

### 1. CRITICAL — Fix timezone mismatch in `buildEventAnnotations`
- [x] Parse `evt.event_date` manually (`split('-')`) to construct local-time Date, avoiding UTC parse of ISO date strings
- [x] Use consistent local-time Date for both event date and start-of-year

### 2. HIGH — Fix timezone bug in `handleSave` year extraction
- [x] Extract year from the `eventDate` string directly via `parseInt(eventDate.split('-')[0], 10)` instead of `new Date(eventDate).getFullYear()`

### 3. HIGH — Add AbortController to `fetchEvents`
- [x] Pass AbortController signal through the fetch effect cleanup to cancel stale requests
- [x] Guard all state setters with `signal?.aborted` checks

### 4. HIGH — Guard delete of currently-edited event
- [x] In `handleDelete`, if the deleted event's id matches `editingId`, call `resetForm()` to clear the stale edit state

### 5. MEDIUM — Add double-click guard + try/catch to `handleDelete`
- [x] Add `deletingId` state to prevent concurrent delete requests
- [x] Wrap Supabase call in try/catch for network error resilience
- [x] Show spinner on delete button while in progress

### 6. MEDIUM — Handle error in event types fetch
- [x] Destructure and check `error` from the `dropdown_categories` query
- [x] Destructure and check `error` from the `dropdown_values` query
- [x] Log failures via console.error with descriptive messages

## Files Affected
- `src/components/research/KeyEventsOverlay.tsx` (modify)

## Review
- **Timezone fix**: `buildEventAnnotations` now parses date strings manually via `split('-')` and constructs both dates in local time, eliminating the UTC-vs-local mismatch that caused off-by-one day errors in negative UTC offset timezones
- **Year extraction fix**: `handleSave` extracts year via `parseInt` on the date string instead of `new Date().getFullYear()`, avoiding wrong-year on Jan 1 in UTC+ timezones
- **Race condition fix**: `fetchEvents` accepts an optional `AbortSignal`; the effect creates an `AbortController` and aborts on cleanup, preventing stale responses from overwriting fresh state
- **Edit-delete guard**: Deleting an event that's currently being edited now calls `resetForm()`, preventing the form from submitting an update to a non-existent row
- **Double-click guard**: `deletingId` state prevents concurrent delete requests; delete button shows a spinner and is disabled while in progress
- **Error handling**: Both dropdown queries now check for errors and log descriptive messages instead of silently failing
