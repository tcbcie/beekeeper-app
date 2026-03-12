# Dashboard Redesign

## Overview
Streamlined the dashboard from 12 sections to 8, answering the three questions a beekeeper asks when opening the app:
1. "What needs my attention right now?" — alerts at the top
2. "How are my apiaries doing?" — weather cards with scale trends
3. "What's coming up?" — upcoming events, recent activity

## Layout (top to bottom)
1. **Header** — title, admin badge, ticket status (subtitle removed)
2. **Attention Banner** — only renders if something needs attention: overdue inspections, old queens, high varroa, tasks due today
3. **My Apiaries** — weather cards in 2-column grid (inspect button removed)
4. **Stats + Quick Actions** — wrapping stats strip + 6 action chips in one Panel
5. **Upcoming Events** — tomorrow through 7 days out (today filtered out, hidden when empty)
6. **Recent Activity** — 5 most recent records with apiary name shown
7. **Teams & Collaboration** — collapsed accordion combining shared stats, teams, rearing groups
8. **Version Footer**

## Key Changes

### Attention Banner (promoted)
- Moved from position 5 to position 2 — first thing after the header
- Only renders when something needs attention (zero noise when all is well)
- Chips: overdue inspections (14d+), old queens (2yr+), high varroa (>3%), tasks due today
- Each chip links to its relevant page
- New `todayTasks` field added to `AttentionAlerts` type, queried via `tasks_events` table

### Apiary Weather Cards (refined)
- **Inspect button removed** — was a nested `<button>` inside a `<Link>`, an accessibility anti-pattern. Inspection is one click away from the apiary detail page
- Stats row simplified to Hives count + Last Inspected
- 7-day forecast, current weather, and scale weight trends retained

### Stats Strip + Quick Actions (combined)
- **5 large StatCards replaced** with a compact wrapping stats strip
- Each stat: icon + label + bold number, all clickable and linking to its page
- Uses `flex-wrap` on mobile so all 5 items are visible without scrolling
- Quick action chips (New Inspection, Log Feeding, Varroa Check, Add Treatment, Log Harvest, New Task) sit below in the same Panel

### Upcoming Events (refined)
- Filters out today's items (already shown in attention banner)
- Returns `null` when no future events — no empty "No events" message
- "View All Tasks" link added at the bottom
- Dead `daysUntil === 0` branch removed from badge colour logic

### Recent Activity (enhanced)
- Apiary name now shown on each row via expanded Supabase query: `hives(hive_number, apiaries(name))`
- Displayed as a middot-separated suffix on the date line
- Hive join types updated in `dashboard.ts` to include `apiaries?: { name: string } | null`

### Teams & Collaboration (collapsed accordion)
- **4 separate sections** (Shared by Me, Shared with Me, My Teams, Rearing Groups) combined into one collapsible accordion
- **Default: collapsed** — shows summary line ("2 teams, 1 rearing group") with chevron toggle
- Shows "Loading..." in summary while data is being fetched
- TeamsSection and RearingGroupsSection only render when relevant (guarded by `isTeamMember` / `isRearingGroupMember`)
- Sub-components render as plain `<div>` instead of nested `<Panel>` to avoid double borders

### Loading Skeleton (updated)
- Matches new layout: apiary card placeholders, stats strip placeholder, recent activity rows
- No more 5-card StatCard skeleton grid

## Mobile-First Accessibility

### Font Size Floor (50+ audience)
All dashboard card fonts enforce a minimum size for readability by older users:
- **Labels** (Hives, Last Inspected, Forecast, day names, scale avg): `text-xs` (12px) minimum
- **Values** (hive count, inspection days, temperatures): `text-sm` (14px) to `text-base` (16px)
- **Apiary name**: `text-base` (16px)
- **Stats strip**: labels `text-sm` (14px), values `text-base` (16px)
- **Weight chips**: labels `text-xs` (12px), values `text-sm` (14px)
- No font below `text-xs` (12px) anywhere in dashboard cards

### Stats Strip Discoverability
- Uses `flex-wrap` instead of `overflow-x-auto` — all 5 stats wrap to multiple rows on narrow screens
- No hidden content requiring scroll gestures

## Files Changed

| File | Change |
|------|--------|
| `src/app/dashboard/page.tsx` | Promoted alerts, removed subtitle, compact stats strip with flex-wrap, teams accordion, updated skeleton |
| `src/components/dashboard/ApiaryWeatherRow.tsx` | Removed inspect button/useRouter, bumped all fonts to 12px+ floor |
| `src/components/UpcomingEvents.tsx` | Filters today's items, hides when empty, added "View All Tasks" link |
| `src/hooks/useDashboardStats.ts` | Added today's tasks query, expanded activity queries with `apiaries(name)` join |
| `src/types/dashboard.ts` | Added `todayTasks` to `AttentionAlerts`, added `apiaries` to hive join types |
| `src/app/dashboard/records/page.tsx` | Handles `?apiary=` parameter for pre-selected apiary filtering |

## Data Flow

### Today's Tasks Alert
```
tasks_events table
  → filter: user_id, completed=false, start_date=today
  → count returned as alerts.todayTasks
  → rendered as chip in attention banner
```

### Apiary Name in Recent Activity
```
inspections/varroa_checks/feedings/etc.
  → select('*, hives(hive_number, apiaries(name))')
  → record.hives?.apiaries?.name (single object, not array — many-to-one join)
  → displayed as "12/03/2026 · Apiary Name"
```
