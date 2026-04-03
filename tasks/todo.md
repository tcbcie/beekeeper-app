# Mating Nucs Layout Improvements

**Date:** 03/04/2026
**Status:** Complete

## Plan

- [x] 1. Replace detail card grid with compact inline text — Batch, Source, Location shown as middot-separated line under the nuc name
- [x] 2. Move timeline dates to expanded section — collapsed row shows just name + status + context + actions
- [x] 3. Compact action buttons — 28px icon-only circular buttons (matching Queen Tracker style)
- [x] 4. Make nuc name clickable with chevron to expand/collapse, removed separate expand button
- [x] 5. Reduce card padding and spacing (p-4 → px-3 py-2, space-y-2 → space-y-1.5)
- [x] 6. Expanded section shows timeline dates as inline key:value pairs with flex-wrap

## Review

### Changes Made

1. **Inline context line** — Batch, Cell, Source queen, and Location merged into a single middot-separated line under the nuc name, replacing the grid of individually-styled `NUC_DETAIL_CARD_CLASS` cards.

2. **Timeline in expanded section** — Setup, Cell In, Emerged, Mated, Dead, Queen Seen, Marked, Weight, and Updated dates moved out of the collapsed row into an inline flex-wrap section shown only when expanded.

3. **Compact action buttons** — Replaced the large 44px touch-target `Button` components with 28px icon-only circular `<button>` elements matching the Queen Tracker style. Icon size reduced from 18px to 13px.

4. **Clickable nuc name** — Nuc name is now a `<button>` with a chevron icon (same pattern as Queen Tracker), removing the separate expand/collapse `Button`.

5. **Reduced padding** — Card padding from `p-4` to `px-3 py-2`, list spacing from `space-y-2` to `space-y-1.5`.

6. **Inline expanded timeline** — Timeline dates shown as `key: value` text pairs in a flex-wrap layout with `gap-x-5 gap-y-1`.

### Cleanup
- Removed unused `NUC_DETAIL_CARD_CLASS` constant
- Removed unused `MapPin` and `Calendar` imports from lucide-react
