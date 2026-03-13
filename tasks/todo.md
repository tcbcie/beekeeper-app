# Drag-and-Drop Quick Action onto Apiary Cards

**Date:** 2026-03-13

## Tasks

- [x] **1. Make the "New Inspection" chip draggable**
  - Added `draggable` + `onDragStart`/`onDragEnd` with `application/x-action` data transfer
  - Opacity dims during drag, `cursor-grab` hint
  - Small `GripVertical` icon added as visual affordance

- [x] **2. Make entire ApiaryWeatherRow card a drop target**
  - `onDragOver`/`onDragEnter`/`onDragLeave`/`onDrop` on the outer `<Link>`
  - `dragCounterRef` prevents flicker from child enter/leave events
  - Amber highlight ring + border on dragover
  - On drop: navigates to `/dashboard/records?create={type}&apiary={id}`

## Review

### Files Changed
| File | Change |
|------|--------|
| `src/app/dashboard/page.tsx` | "New Inspection" chip now draggable with grip icon |
| `src/components/dashboard/ApiaryWeatherRow.tsx` | Card accepts drop, highlights on dragover, navigates on drop |
