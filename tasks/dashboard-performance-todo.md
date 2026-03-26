# Dashboard Performance Optimisation

## Problem
Dashboard LCP is 4.09s (needs improvement). RES score dropped to 84/100 with /dashboard at 79.
Root cause: 30-40+ database/API calls on initial load, heavy client-side computation, and no deferred rendering for below-the-fold content.

## Investigation Findings

### Current Data Flow on Dashboard Mount
1. **useDashboardStats** — 16+ Supabase queries in 4 sequential phases
2. **useTeams** — 4 queries
3. **useTicketStatus** — 2 queries
4. **useRearingGroups** — 2+ queries
5. **Navbar** — 2 queries (subscription RPC, profile completeness)
6. **Sidebar** — 1 query (user role)
7. **ApiaryWeatherRow** (per apiary) — weather API + GDD + scale + bloom data

### Key Bottlenecks
- **Waterfall queries**: 4 sequential phases in useDashboardStats (overview → enrichment → alerts → activity)
- **No deferred rendering**: All sections render together; non-visible content blocks LCP
- **Heavy client-side computation**: GDD, foraging hours, bloom calculations per apiary card
- **All inspections fetched**: Full inspection history loaded into memory for health analysis
- **5 separate recent activity queries**: Could be a single database function

---

## Plan

### Phase 1: Quick Wins (Highest Impact, Lowest Risk)
- [x] **1.1 Dynamic import ApiaryWeatherRow** — Lazy-load the heaviest component with `next/dynamic` + loading skeleton.
- [x] **1.2 Dynamic import UpcomingEvents** — Lazy-load below-the-fold component with `next/dynamic`.
- [x] **1.3 Split loading state** — Move `setLoading(false)` to fire after overview data so page renders before recent activity finishes.

### Phase 2: Query Optimisation (Medium Impact)
- [x] **2.1 Consolidate recent activity queries** — Created `get_recent_activity` RPC replacing 5 separate queries with 1.
- [x] **2.2 Consolidate overview + enrichment + alerts** — Created `get_dashboard_overview` RPC replacing 16+ queries with 1. Includes health signal analysis (queenright/brood risk) computed server-side.

### Phase 3: Rendering Optimisation (Lower Priority)
- [x] **3.1 Wrap ApiaryWeatherRow in React.memo** — Prevents re-renders when parent state changes (recent activity, teams, etc.) don't affect the card props.
- [x] **3.2 Verified memoisation** — GDD/foraging/bloom computations already only recompute when weather data changes. `sortedApiaries` is properly memoized. `handleApiaryActionDrop` is stable via `useCallback`.

---

## Review

### Changes Made

**Database (2 new RPCs):**
- `get_dashboard_overview(p_user_id)` — Single RPC that returns stats, alerts, and enriched apiaries (with hive counts, health signals, scales, task counts) in one round trip. Replaces 16+ sequential Supabase queries.
- `get_recent_activity(p_user_id, p_limit)` — Single RPC returning the N most recent records across inspections, treatments, checks, feedings, and harvests. Replaces 5 separate queries + client-side merge/sort.

**Frontend:**
- `src/hooks/useDashboardStats.ts` — Rewritten from 447 lines to ~130 lines. Now makes 2 RPC calls instead of 16+ individual queries. Loading state split so page renders after overview data.
- `src/app/dashboard/page.tsx` — ApiaryWeatherRow and UpcomingEvents changed to `next/dynamic` imports with skeleton loaders. Reduced initial bundle size.
- `src/components/dashboard/ApiaryWeatherRow.tsx` — Wrapped in `React.memo` to prevent unnecessary re-renders.

**SQL migration file:**
- `src/sql/create_dashboard_rpc_functions.sql` — Contains both RPC definitions for reference.

### Expected Impact
- **Network round trips**: 16+ sequential queries → 2 RPC calls (overview + activity)
- **LCP improvement**: Faster first render via split loading + dynamic imports
- **Bundle size**: ApiaryWeatherRow (889 lines + dependencies) and UpcomingEvents now code-split
- **Re-render prevention**: `React.memo` on ApiaryWeatherRow prevents cascading re-renders
- **Server-side computation**: Health signal analysis (queenright/brood risk) moved from client JS to PostgreSQL CTEs

### Files Changed
- `src/hooks/useDashboardStats.ts`
- `src/app/dashboard/page.tsx`
- `src/components/dashboard/ApiaryWeatherRow.tsx`
- `src/sql/create_dashboard_rpc_functions.sql` (new)
