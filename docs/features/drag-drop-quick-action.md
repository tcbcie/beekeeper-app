# Quick Action → Apiary: Drag (Desktop) / Tap-to-Select (Mobile)

**Date:** 2026-03-13
**Status:** Implemented

## Overview

Two quick action buttons on the dashboard ("New Inspection" and "New Task") can be applied to a specific apiary. On desktop, drag the button onto an apiary card. On mobile, tap the button to enter selection mode, then tap an apiary card.

## How It Works

### Desktop — Drag and Drop
1. Drag a quick action button onto any apiary card.
2. The card highlights with an amber border on dragover.
3. On drop, navigates to the appropriate form with the apiary pre-selected.

### Mobile — Tap-to-Select
1. Tap a quick action button → enters selection mode.
2. An amber banner appears: "Tap an apiary below to apply {action}" with a Cancel option.
3. All apiary cards show a subtle amber border indicating they are targets.
4. Tap an apiary card → navigates to the pre-filled form.
5. Tap the banner or button again → cancels selection mode.

## Navigation Targets

| Action | Drop target URL |
|--------|----------------|
| New Inspection | `/dashboard/records?create=inspection&apiary={id}` |
| New Task | `/dashboard/tasks?create=true&apiary={id}` |

## Technical Details

### Desktop
- HTML5 Drag and Drop API (`draggable`, `onDragStart`/`onDragEnd`, `onDragOver`/`onDrop`).
- `dragCounterRef` prevents highlight flicker from child enter/leave events.
- `data-[dragover=true]:` Tailwind variants for highlight styling.
- Grip icon visible only on desktop (`hidden md:block`).

### Mobile
- `activeAction` React state toggled on click when `'ontouchstart' in window`.
- `ApiaryWeatherRow` receives `activeAction` and `onActionDrop` props.
- When `activeAction` is set, card click is intercepted (`e.preventDefault`) and calls `onActionDrop`.
- No touch event manipulation — works with native scrolling and avoids context menu conflicts.

## Files

| File | Role |
|------|------|
| `src/app/dashboard/page.tsx` | Quick action buttons, selection state, drop handler |
| `src/components/dashboard/ApiaryWeatherRow.tsx` | Drop target (desktop DnD + mobile tap) |
| `src/app/dashboard/tasks/page.tsx` | `?create=true&apiary=` opens form with apiary pre-filled |
