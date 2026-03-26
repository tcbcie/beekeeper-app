# Dashboard Performance Optimisation

## Overview
Optimised the dashboard page to reduce Largest Contentful Paint (LCP) from 4.09s and improve the Real Experience Score (RES) from 79 on the /dashboard route.

## Problem
The dashboard was making 30-40+ database/API calls on initial load across 4 sequential phases, plus per-apiary weather/GDD/scale/bloom fetches. All data had to complete before the loading skeleton was replaced with content.

## Solution

### Database RPCs
Two PostgreSQL functions consolidate the query load:

1. **`get_dashboard_overview(p_user_id)`** — Returns a single JSONB object containing:
   - Stats: apiary count, hive count, recent inspections, active queens, active tasks
   - Alerts: overdue inspections, old queens, high varroa, today's tasks
   - Enriched apiaries: hive counts, last inspection/queenright dates, health signals (queenright/brood risk), scale devices, task counts

2. **`get_recent_activity(p_user_id, p_limit)`** — Returns the N most recent records across inspections, varroa treatments, varroa checks, feedings, and harvests with hive/apiary context.

### Frontend Optimisations
- **Dynamic imports**: `ApiaryWeatherRow` and `UpcomingEvents` lazy-loaded via `next/dynamic` with skeleton fallbacks
- **Split loading state**: Page renders after overview data; recent activity loads in the background
- **React.memo**: `ApiaryWeatherRow` wrapped in `memo` to prevent re-renders from unrelated parent state changes

## Technical Details

### Health Signal Analysis (Server-Side)
The queenright and brood risk analysis is computed entirely in PostgreSQL using CTEs:
- **Queenright risk**: Hive has no queen_seen/eggs_present signal in last 21 days
- **Brood risk**: Continuous run of brood_frames=0 inspections (no brood seen or unknown readings in between) older than 21 days
- **Queen issue**: Union of queenright risk and brood risk per apiary

### Caching (Unchanged)
Per-apiary weather/scale/GDD/bloom caching in ApiaryWeatherRow remains unchanged:
- Weather: 15-minute TTL
- Scale data: 5-minute TTL
- GDD: 24-hour TTL
- Bloom data: 24-hour TTL
- Community records: 1-hour TTL

## Files
- `src/hooks/useDashboardStats.ts` — Hook using the 2 RPCs
- `src/app/dashboard/page.tsx` — Dynamic imports
- `src/components/dashboard/ApiaryWeatherRow.tsx` — React.memo wrapper
- `src/sql/create_dashboard_rpc_functions.sql` — RPC definitions
