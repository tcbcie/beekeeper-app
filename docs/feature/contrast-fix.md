# Contrast Fix (Light Mode)

## Problem
Poor text contrast on light pastel backgrounds across the app. Particularly noticeable on Android tablets (Galaxy Tab A9+ 5G) in Chrome. Light backgrounds (`bg-*-50`, `bg-*-100`) paired with mid-tone text (`text-*-600`, `text-*-700`, `text-*-800`) produced contrast ratios of 3-5:1, failing WCAG AA standards (4.5:1 required for small text).

## Solution
Two-part fix:

1. **Global CSS custom properties** - Darkened `--text-secondary` and `--text-tertiary` values used throughout the app
2. **Per-file Tailwind classes** - Bumped text colour darkness on pastel backgrounds:
   - `-600` → `-800`
   - `-700` → `-900`
   - `-800` → `-900`

Only light mode classes were modified. All `dark:` prefixed classes remain unchanged.

## Affected Areas
- Dashboard stat cards and ticket badges
- Tasks priority badges, email reminder, team task, and created-by badges
- Community Map style toggles, delete button, and privacy banner
- About page ticket status, priority, and type badges
- Apiaries edit/delete/transfer buttons
- Hives scale connection buttons
- Queens marking colour and status badges
- Profile page disconnect buttons, remove member buttons, pending invitation badges
- UpcomingEvents urgency badges
- WildColonyInspectionCard status and observation badges
- MapLocationPicker style toggle and close buttons
- NewsArticlesManager knowledge base tag badges
- Public about, privacy, and terms page header badges
