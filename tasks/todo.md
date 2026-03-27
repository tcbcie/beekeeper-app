# Task: Key Events — Add Edit Functionality
**Date:** 27/03/2026
**Status:** Complete

## Objective
Allow users to edit existing key events inline, reusing the existing add form.

## Plan

### 1. Add edit state and handler to `KeyEventsOverlay.tsx`
- [x] Add `editingId` state to track which event is being edited
- [x] Add `Pencil` and `X` icon imports from lucide-react
- [x] Add `handleEdit` function that populates the form with the event's current values
- [x] Modify `handleSave` to use `update` when `editingId` is set, `insert` when not
- [x] Add `resetForm` helper that clears `editingId` and form fields

### 2. Update the event list UI
- [x] Add an edit (pencil) button next to the delete button on each event row
- [x] Update the form save button text to show "Update" vs "Save" based on edit mode
- [x] Add button toggles to "Cancel" / X icon when form is open

### 3. Documentation
- [x] Update `docs/features/key-events.md` with edit capability

## Files Affected
- `src/components/research/KeyEventsOverlay.tsx` (modify)
- `docs/features/key-events.md` (modify)

## Review
- Added `editingId` state — when non-null, the form operates in edit mode
- `handleEdit(evt)` pre-fills date, type, and notes from the clicked event
- `handleSave` branches: uses Supabase `.update()` when editing, `.insert()` when adding
- `resetForm()` clears all form fields + editingId + hides form — used by save, cancel, and the top-level toggle
- Pencil icon added next to delete on each event row
- Save button shows "Update" in edit mode, "Save" in add mode
- Top "Add" button becomes "Cancel" (with X icon) when form is open
- No new dependencies or files — all changes within existing component
