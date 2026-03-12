# Dashboard Mobile Fixes - Todo

## Issue 1: Apiary card fonts too small on mobile
- [x] Bump `text-[9px]` labels and data to `text-[11px]` in ApiaryWeatherRow
- [x] Bump `text-[10px]` to `text-xs` (12px)
- [x] Bump weather description `text-[11px]` to `text-xs`
- [x] Bump WeightChip label from `text-[9px]` to `text-[10px]`

## Issue 2: Stats strip not discoverable on mobile
- [x] Replace horizontal scroll with flex-wrap on mobile so all 5 stats are visible
- [x] Remove pipe separators (don't work in wrapped layout)
- [x] Keep single-row on desktop (naturally fits)

## Review

### Changes
| File | Change |
|------|--------|
| `src/components/dashboard/ApiaryWeatherRow.tsx` | Bumped all `text-[9px]` to `text-[11px]`, `text-[10px]` to `text-xs`, weather description to `text-xs`, scale icon 10→12px |
| `src/app/dashboard/page.tsx` | Stats strip: replaced `overflow-x-auto` with `flex-wrap`, removed pipe separators and `shrink-0` |

### Summary
- All apiary card fonts now meet minimum mobile readability (~11px+)
- Stats strip wraps naturally on mobile — all 5 items visible without scrolling
- On desktop, items still fit in a single row naturally
