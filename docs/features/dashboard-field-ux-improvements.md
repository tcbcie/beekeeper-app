# Dashboard Field UX Improvements

**Date:** 2026-03-13
**Status:** Planned

## Overview

Five targeted UX improvements to make the dashboard more usable in field conditions (gloves, sun glare, GPS context).

---

## 1. Glove Test — Simplify Bottom Navigation

**Problem:** Bottom nav has 12 scrollable items. With gloves or sticky hands, mis-taps are frequent.

**Solution:** Reduce bottom nav to 5 primary tabs: **Overview, Apiaries, Records, Tasks, More**. All other pages (Queens, Queen Rearing, Hives, Logbook, Reports, Research, Community Map, Tools) remain accessible via the existing "More" drawer.

**Files changed:**
- `src/lib/navigation.ts` — add `bottomNav: true` flag to 4 primary items
- `src/components/BottomNavBar.tsx` — filter to only `bottomNav` items instead of all non-pinned items

---

## 2. Push Quick Actions Above the Fold

**Problem:** Quick Actions (New Inspection, Log Feeding, etc.) are buried below Apiary Weather cards. A user in a bee suit wants one-tap access.

**Solution:** Move the Quick Actions block to appear directly after "Attention Needed" alerts, before the Apiary Weather section. Keep the Stats Strip as a separate row within the same panel as before, just below apiaries.

**Files changed:**
- `src/app/dashboard/page.tsx` — reorder JSX sections

---

## 3. Collapse Weather Forecast by Default

**Problem:** 7-day forecast per apiary consumes massive vertical space. Likely identical across nearby apiaries.

**Solution:** Collapse the 7-day forecast by default. The card header already shows current temp + icon. Add a small expand/collapse toggle to reveal the forecast on demand.

**Files changed:**
- `src/components/dashboard/ApiaryWeatherRow.tsx` — add collapsed state for forecast section with toggle

---

## 4. GPS-Based Apiary Sorting

**Problem:** If standing at an apiary, the user must scroll to find it.

**Solution:** On dashboard load, request device GPS (if permitted). Calculate distance to each apiary and sort nearest-first. Fall back to default order if GPS is denied or unavailable.

**Files changed:**
- `src/app/dashboard/page.tsx` — add geolocation hook, sort apiaries by distance
- `src/hooks/useGeolocation.ts` — new hook (small, reusable)

---

## 5. Sun Glare Contrast Improvements

**Problem:** Light text and pastel badge backgrounds wash out in direct sunlight.

**Solution:** Audit and darken text used for dates, badge labels, and data values. Bump font-weight on data points. Ensure all text meets WCAG AA contrast ratio (4.5:1 minimum).

**Targets:**
- Recent Activity date text (`text-text-secondary` / `text-text-tertiary`)
- Badge backgrounds (Queen Seen, infestation %, treatment type)
- Weather forecast day labels and temps
- Stats strip values

**Files changed:**
- `src/app/dashboard/page.tsx` — strengthen date/badge text colours
- `src/components/dashboard/ApiaryWeatherRow.tsx` — darken forecast labels
