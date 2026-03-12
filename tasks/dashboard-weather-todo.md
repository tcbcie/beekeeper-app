# Dashboard Apiary Weather Cards

## Goal
Redesign the dashboard apiary card to show:
- **Line 1:** Icon + apiary name (location) + current weather (icon + temp)
- **Line 2:** 7-day forecast (day, icon, high/low)
- **Line 3:** Stats — hive count, last inspection badge
- **Line 4 (conditional):** If apiary has hives with scales — average weight change today, 7d, 30d

## Plan

- [x] **1. Update `useDashboardStats` hook** — fetch apiary list with name, location, city, lat/lng
- [x] **2. Create initial `ApiaryWeatherRow` component**
- [x] **3. Add apiary weather section to dashboard page**
- [x] **4. Redesign `ApiaryWeatherRow` into multi-line card:**
  - Line 1: MapPin icon + name (location) + current weather
  - Line 2: 7-day forecast row
  - Line 3: Hive count badge + last inspection badge
  - Line 4: Scale weight averages (24h, 7d, 30d) — only if apiary has scales
- [x] **5. Fetch hive count + last inspection per apiary** — enrichment in dashboard hook
- [x] **6. Fetch scale data per apiary** — aggregate from hives with beep/wolf scales via existing API routes

## Review

### Files Changed
1. **`src/types/dashboard.ts`** — added `DashboardApiaryScale` and enriched `DashboardApiary` with `hiveCount`, `lastInspectionDate`, `scales[]`
2. **`src/hooks/useDashboardStats.ts`** — after fetching apiary list, enriches each apiary with:
   - Active hive count (from `hives` table, excludes archived)
   - Last inspection date (latest across all hives in apiary)
   - Scale info (beep_device_id / wolf_scale_id per hive)
3. **`src/components/dashboard/ApiaryWeatherRow.tsx`** — redesigned multi-line card:
   - Line 1: Name (location) linked to detail page + current weather icon/temp
   - Line 2: 7-day forecast (scrollable on mobile)
   - Line 3: Hive count badge + colour-coded last inspection badge
   - Line 4: Average scale weight changes (24h/7d/30d) — only shown for apiaries with scales, fetched via existing `/api/beep/data` and `/api/wolf-waagen/data` endpoints
4. **`src/app/dashboard/page.tsx`** — "My Apiaries" section renders one card per apiary

### Design Decisions
- Scale data fetched sequentially per scale to respect API rate limits (same pattern as existing code)
- Average weight displayed when multiple scales exist in one apiary
- Scale row hidden entirely when apiary has no configured scales
- Inspection badge uses same colour coding as existing ApiaryCard (green <7d, amber <14d, red 14d+)
