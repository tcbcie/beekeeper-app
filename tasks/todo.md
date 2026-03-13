# Simplify Quick Actions to Two Big Draggable Buttons

**Date:** 2026-03-13

## Tasks

- [x] **1. Remove Log Feeding, Varroa Check, Add Treatment, Log Harvest**
  - Stripped down to just "New Inspection" and "New Task"
  - Inspection page already allows selecting any record type

- [x] **2. Make both buttons bigger and side-by-side**
  - Changed from `flex-wrap` chips to `grid grid-cols-2` with `py-3` padding
  - Larger icons (18px), `text-base font-semibold`

- [x] **3. Enable drag-and-drop for "New Task"**
  - Added `dragType: 'task'` — both buttons now draggable
  - Drop routes: `task` → `/dashboard/tasks?create=true&apiary={id}`, others → records page
  - Updated `VALID_DROP_ACTIONS` and drop handlers in both files

- [x] **4. Tasks page: handle `?create=true&apiary=` (no hive)**
  - Extended `?apiary=` useEffect to open form with apiary pre-filled when `create=true`

## Review

### Files Changed
| File | Change |
|------|--------|
| `src/app/dashboard/page.tsx` | Two-button grid, both draggable, task-aware routing |
| `src/components/dashboard/ApiaryWeatherRow.tsx` | Drop handler routes `task` to tasks page |
| `src/app/dashboard/tasks/page.tsx` | `?create=true&apiary=` opens form with apiary pre-filled |
