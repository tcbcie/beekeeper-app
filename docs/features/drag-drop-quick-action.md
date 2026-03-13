# Drag-and-Drop: Quick Action onto Apiary Cards

**Date:** 2026-03-13
**Status:** Implemented

## Overview

Users can drag the "New Inspection" quick action chip onto any apiary card on the dashboard. On drop, the app navigates to the records page with the inspection form pre-filled for that apiary.

## How It Works

1. The "New Inspection" chip has `draggable` enabled and a small grip icon as a visual hint.
2. On drag start, the chip sets `application/x-action` data transfer with the action type (`inspection`).
3. Each apiary card (`ApiaryWeatherRow`) is a drop target — the entire card accepts the drop.
4. On dragover, the card highlights with an amber border and ring.
5. On drop, the app navigates to `/dashboard/records?create={actionType}&apiary={apiaryId}`.
6. The records page already supports `?create=` and `?apiary=` query params for all record types.

## Technical Details

### Desktop (HTML5 Drag and Drop API)
- `draggable` + `onDragStart`/`onDragEnd` on the chip, `onDragOver`/`onDrop` on cards.
- `dragCounterRef` prevents highlight flicker caused by child element enter/leave events.
- The chip dims to 50% opacity during drag for visual feedback.

### Mobile (Touch Events)
- HTML5 DnD doesn't work on mobile — separate touch event handlers added.
- `onTouchStart` creates a floating ghost element (`position:fixed`) that follows the finger.
- `onTouchMove` moves the ghost and uses `document.elementFromPoint()` to find the apiary card under the finger. Temporarily hides the ghost to avoid self-detection.
- `onTouchEnd` checks if the finger is over an apiary card (via `data-apiary-id` attribute) and navigates.
- Cards use Tailwind `data-[dragover=true]:` variants for touch highlight styling (set via `dataset.dragover`).
- `select-none` on the chip prevents text selection and context menu on long press.

## Files

| File | Role |
|------|------|
| `src/app/dashboard/page.tsx` | Draggable "New Inspection" chip |
| `src/components/dashboard/ApiaryWeatherRow.tsx` | Drop target with highlight and navigation |

## Extensibility

The `dragType` property on quick action items makes it easy to enable drag-and-drop for other actions (feeding, varroa check, etc.) by simply adding `dragType: 'feeding'` to the action config.
