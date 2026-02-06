# Fix App-Wide Contrast Issues (Light Mode)

## Tasks

- [x] 1. Global CSS - Darken `--text-secondary` and `--text-tertiary`
- [x] 2. Dashboard `page.tsx` - Stat card text colours
- [x] 3. Tasks `page.tsx` - Priority/badge text colours
- [x] 4. Community Map `page.tsx` - Map controls/banner text
- [x] 5. About `page.tsx` - Ticket status/priority badges and admin badge
- [x] 6. Apiaries `page.tsx` - Button text colours
- [x] 7. Hives `[id]/page.tsx` - Scale button text
- [x] 8. Queens `page.tsx` - Status badge text
- [x] 9. Profile `page.tsx` - Badge/button text
- [x] 10. UpcomingEvents component - Urgency badge text
- [x] 11. WildColonyInspectionCard - Status/detail badge text
- [x] 12. MapLocationPicker - Map control text
- [x] 13. NewsArticlesManager - Tag badge text
- [x] 14. Public pages (about, privacy, terms) - Badge text
- [x] 15. Review and summary

## Review

### Summary
Fixed poor text contrast across the entire app in light mode. The issue was systemic: light pastel backgrounds (`bg-*-50`, `bg-*-100`) were paired with insufficiently dark text (`text-*-600`, `text-*-700`, `text-*-800`), producing marginal contrast ratios (3-5:1) that fail WCAG standards on devices like Galaxy Tab A9+.

### Changes Made

**Global CSS (1 file, 2 lines)**
- `--text-secondary`: `#4a4a4a` → `#374151` (gray-700 equivalent)
- `--text-tertiary`: `#737373` → `#555555`

**Tailwind class bumps (16 files, ~55 individual class changes)**
- `text-*-600` on `-50`/`-100` backgrounds → `text-*-800`
- `text-*-700` on `-50`/`-100` backgrounds → `text-*-900`
- `text-*-800` on `-100` backgrounds → `text-*-900`

**Dark mode classes left untouched** — all changes only affect the light mode portion of conditional classes.

### Files Modified
1. `src/app/globals.css`
2. `src/app/dashboard/page.tsx`
3. `src/app/dashboard/tasks/page.tsx`
4. `src/app/dashboard/community-map/page.tsx`
5. `src/app/dashboard/about/page.tsx`
6. `src/app/dashboard/apiaries/page.tsx`
7. `src/app/dashboard/hives/[id]/page.tsx`
8. `src/app/dashboard/queens/page.tsx`
9. `src/app/dashboard/profile/page.tsx`
10. `src/components/UpcomingEvents.tsx`
11. `src/components/wild-colonies/WildColonyInspectionCard.tsx`
12. `src/components/MapLocationPicker.tsx`
13. `src/components/admin/NewsArticlesManager.tsx`
14. `src/app/(public)/about/page.tsx`
15. `src/app/(public)/privacy/page.tsx`
16. `src/app/(public)/terms/page.tsx`

### Verification Needed
- Test on Android tablet (Galaxy Tab A9+ 5G) in Chrome, light mode
- Check: Dashboard stat cards, Tasks badges, Community Map banner, About page tickets, Profile page badges, Apiaries buttons, Queens status badges
- Verify dark mode still looks correct
