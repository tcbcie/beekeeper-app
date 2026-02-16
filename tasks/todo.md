# Scrollable Bottom Nav with More Button

## Goal
Make the mobile bottom navigation bar horizontally scrollable, showing more menu items from the centralised navigation config, with the "More" button pinned to the right.

## Todo

- [x] Update `BottomNavBar.tsx` to import items from `navigation.ts` instead of hardcoding 4 items
- [x] Make the nav items area horizontally scrollable (overflow-x-auto, hide scrollbar)
- [x] Pin the "More" button to the far right, outside the scrollable area
- [x] Ensure active item styling still works correctly
- [x] Create/update feature documentation in `docs/features/`
- [x] QA: Fix P1 — auto-scroll active item into view on route change
- [x] QA: Fix P2 — add right-edge fade gradient for scroll affordance
- [x] QA: Fix P3 — add `touch-manipulation` to nav links and More button

## Files Changed
- `src/components/BottomNavBar.tsx` — scrollable nav from centralised config, auto-scroll to active, touch-manipulation
- `src/app/globals.css` — added `scrollbar-hide` + `scroll-fade` utilities
- `docs/features/navigation-restructure.md` — updated bottom nav section

## Review

### Summary
The bottom nav bar now shows all main navigation items in a horizontally scrollable row. The "More" button is pinned to the right. Active item auto-scrolls into view on navigation. A right-edge fade hints at more content.

### QA Fixes Applied
| Issue | Severity | Fix |
|-------|----------|-----|
| Active item off-screen with no indication | P1 | `scrollIntoView({ inline: 'center' })` on active ref, triggered on pathname change |
| No visual scroll affordance | P2 | `mask-image` gradient fading the right edge to transparent |
| Missing `touch-manipulation` | P3 | Added to all Link and button elements |

### Route collision analysis
Verified all 15 nav item hrefs — no `startsWith` prefix collisions exist. `/dashboard/records` vs `/dashboard/reports` vs `/dashboard/research` are all distinct prefixes.

### No breaking changes
- MobileDrawer still works identically via the More button
- Desktop sidebar unaffected
- No database or API changes
