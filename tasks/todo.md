# Replace Mobile Touch Drag with Tap-to-Select

**Date:** 2026-03-13

## Tasks

- [x] **1. Replace touch drag handlers with tap-to-select state**
  - Removed all touch refs/ghost/handlers (touchStart, touchMove, touchEnd, touchCancel)
  - Added `activeAction` state + `handleApiaryActionDrop` callback
  - On touch device: tapping a quick action toggles selection mode

- [x] **2. Add selection mode banner**
  - Amber banner: "Tap an apiary below to apply {action}" with Cancel
  - Tapping banner or button again cancels selection

- [x] **3. Update ApiaryWeatherRow to handle tap-to-apply**
  - New props: `activeAction`, `onActionDrop`
  - When `activeAction` set: click intercepts navigation and calls `onActionDrop`
  - Cards show subtle amber border highlight when in selection mode

- [x] **4. Keep desktop drag-and-drop unchanged**
  - `draggable`, `onDragStart`, `onDragEnd` still work on desktop
  - Grip icon shown only on desktop (`hidden md:block`)

## Review

### Files Changed
| File | Change |
|------|--------|
| `src/app/dashboard/page.tsx` | Replaced touch handlers with tap-to-select state + banner |
| `src/components/dashboard/ApiaryWeatherRow.tsx` | Accept `activeAction`/`onActionDrop` props, intercept click |
