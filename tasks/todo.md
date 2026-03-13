# Drag-and-Drop Quick Action onto Apiary Cards

**Date:** 2026-03-13

## Tasks

- [x] **1. Make the "New Inspection" chip draggable (desktop)**
- [x] **2. Make entire ApiaryWeatherRow card a drop target (desktop)**
- [x] **3. Add touch drag-and-drop for mobile**

## Audit Findings

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 1 | HIGH | Ghost element leaked on unmount or `touchcancel` — orphaned `<div>` stays in `document.body` | Extracted `cleanupTouchDrag` shared by `touchEnd`/`touchCancel`/unmount effect |
| 2 | HIGH | Ghost label hardcoded to "New Inspection" — breaks if other actions get `dragType` | Pass `label` param from action config to `handleTouchStart` |
| 3 | MEDIUM | Duplicate highlight logic — React `dragOver` state and `data-dragover` attribute both applied | Removed React state, unified on `data-dragover` + Tailwind `data-[dragover=true]:` variants |
| 4 | MEDIUM | `actionType` from `dataTransfer` not validated — arbitrary string interpolated into URL | Allowlist check (`VALID_DROP_ACTIONS`) in both desktop drop and touch drop paths |

## Review

### Files Changed
| File | Change |
|------|--------|
| `src/app/dashboard/page.tsx` | Draggable chip + touch handlers + ghost cleanup + action validation |
| `src/components/dashboard/ApiaryWeatherRow.tsx` | Drop target with unified `data-dragover` highlight + action validation |
