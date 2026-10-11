# Hive Detail Page: Light-Mode Contrast Pass

## Problem

The record lists and status badges on the hive detail page (`src/app/dashboard/hives/[id]/page.tsx`)
used dark-mode-only colours: `text-*-400` text, and `bg-*-900/50 text-*-300` badges. In the default
light theme that gave roughly 1.5:1 to 2.5:1 contrast, well below WCAG AA. That is hard to read for
the app's 50+ users working outdoors.

## Fix

This is a class-only change in one file. Each element gained a light-mode colour, and its previous
classes moved behind `dark:`, so **dark mode renders exactly as before**.

| Element | Light mode | Dark mode (unchanged) |
|---|---|---|
| Badges: Queen Seen, Eggs, mite count bands, Active status, Queenless, "Hive not found" | `bg-X-100 text-X-800 border-X-300` | `bg-X-900/50 text-X-300 border-X-800` |
| Treatment type text | `text-red-700` | `text-red-400` |
| Feed type text | `text-orange-800` | `text-orange-400` |
| Honey weight text | `text-yellow-800` | `text-yellow-400` |
| Section icons (Inspections, Varroa Checks, Treatments, Feedings, Harvests) | `text-X-600` (`yellow-700`) | `text-X-400` |

The colour pairs reuse existing codebase patterns: the page's own badge at line 212, the removal-state
text, and the `Toast`/`ConfirmDialog` icon colours. Yellow icons use shade 700 because yellow-600 is just
under the 3:1 contrast that icons need.

## Out of scope

Layout, wording, date formatting and other pages.
