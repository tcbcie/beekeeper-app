# Task: Dashboard Dark Mode Improvements

**Date:** 29/03/2026
**Status:** Complete

## Objective
Improve dark mode readability and visual separation on the dashboard apiary cards.

## Plan

- [x] 1. Increase dark mode background opacity on GDD/forage row (`10%` → `30%`)
- [x] 2. Increase dark mode background opacity on weather condition bar (`20%` → `40%`, hover `30%` → `50%`)
- [x] 3. Increase dark mode background opacity on forecast "today" highlight (`15%` → `30%`)
- [x] 4. Strengthen section borders in dark mode (`border-border/50` → `border-border dark:border-border/70`)
- [x] 5. All changes in `ApiaryWeatherRow.tsx` only

## Review

### Changes Made

- **`src/components/dashboard/ApiaryWeatherRow.tsx`**
  - Weather condition bar ("Drizzle"): `dark:bg-forest-900/20` → `dark:bg-forest-900/40`, hover `dark:hover:bg-forest-900/30` → `dark:hover:bg-forest-900/50`
  - Forecast "today" column highlight: `dark:bg-forest-900/15` → `dark:bg-forest-900/30`
  - GDD/forage row: `dark:bg-green-900/10` → `dark:bg-green-900/30`, border `border-border/50` → `border-border dark:border-border/70`
  - Hives/inspection/queen status row: border `border-border/50` → `border-border dark:border-border/70`

### Notes
- All changes are dark-mode-only opacity increases — light mode is untouched
- No structural or layout changes
