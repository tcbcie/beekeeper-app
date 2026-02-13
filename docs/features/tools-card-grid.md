# Tools Page — Categorised Card Grid

## Overview

The Tools page uses a categorised card grid as its landing view instead of a flat tab bar. Each tool is displayed as a card with an icon, title, and description, grouped into logical categories.

## User Flow

1. **Landing view** (`/dashboard/tools`) — shows 4 categories of tool cards
2. **Open an inline tool** — click a card, URL updates to `?section=<id>`, card grid hides, back button + tool content appears
3. **Open a link tool** (QR Tags, Report Wild Colony) — navigates to its dedicated page
4. **Back to Tools** — returns to the landing grid, URL clears

## Categories

| Category | Tools |
|---|---|
| **Calculators** | Feeding Calculator, Fondant Recipe, Frame Cells |
| **Hive Health** | Varroa Weather, GDD Tracker, Diagnosis |
| **Business** | Profit & Loss, Purchases, Provenance |
| **Utilities** | QR Tags (link), Report Wild Colony (link) |

## URL Behaviour

- `/dashboard/tools` — landing grid
- `/dashboard/tools?section=feeding` — opens Feeding Calculator directly with back button
- Bookmarked URLs continue to work

## File

- `src/app/dashboard/tools/page.tsx` — single file containing all changes

## Responsive Behaviour

- **Mobile**: 1-column card grid
- **Tablet**: 2-column card grid
- **Desktop**: 3-column card grid
