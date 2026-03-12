# Dashboard Redesign - Todo

## Phase 1: Remove inspect button from apiary card
- [x] Remove `<button>` and `useRouter` from `ApiaryWeatherRow.tsx`

## Phase 2: Promote alerts + add today's tasks
- [x] Add `todayTasks` to `AttentionAlerts` type in `dashboard.ts`
- [x] Query today's task count in `useDashboardStats.ts`, add to alerts
- [x] Move alerts block to position 2 (right after header) in `page.tsx`
- [x] Add today's tasks chip to attention banner
- [x] Remove subtitle paragraph from header

## Phase 3: Compact stats + combined quick actions
- [x] Replace StatCard grid + quick actions with single Panel containing inline stats strip + action chips

## Phase 4: Upcoming Events refinement
- [x] Filter out today's items (already in attention banner)
- [x] Hide entirely when no events (no empty message)
- [x] Add "View All Tasks" link at bottom

## Phase 5: Recent Activity — add apiary name
- [x] Expand recent activity query: `hives(hive_number, apiaries(name))`
- [x] Update hive join types to include `apiaries` in `dashboard.ts`
- [x] Display apiary name in RecentActivitySection

## Phase 6: Teams & Groups accordion
- [x] Combine 4 team/group sections (Shared by Me, Shared with Me, My Teams, Rearing Groups) into one collapsible section, default collapsed

## Phase 7: Loading skeleton
- [x] Update skeleton to match new layout (no large stat cards, compact strip instead)

## Review

### Files Changed
| File | Change |
|------|--------|
| `src/components/dashboard/ApiaryWeatherRow.tsx` | Removed inspect button + `useRouter` import |
| `src/types/dashboard.ts` | Added `todayTasks` to `AttentionAlerts`, added `apiaries` to hive join types |
| `src/hooks/useDashboardStats.ts` | Added today's tasks query, expanded activity queries with `apiaries(name)` |
| `src/app/dashboard/page.tsx` | Promoted alerts, removed subtitle, compact stats strip, teams accordion, updated skeleton |
| `src/components/UpcomingEvents.tsx` | Filters today's items, hides when empty, added "View All Tasks" link |

### Summary
- Dashboard reduced from 12 sections to 8
- Alerts promoted to top for immediate visibility, now includes "tasks due today"
- 5 large StatCards replaced with compact inline stats strip (icon + label + number) in one line
- Quick actions moved into the same Panel as stats
- Inspect button removed from apiary cards (was an accessibility anti-pattern — nested interactive inside `<Link>`)
- Upcoming Events no longer shows today's items (handled by alerts) or an empty state
- Recent activity rows now show apiary name via `hive → apiary` join
- 4 team/group sections collapsed into one accordion, default closed
- Loading skeleton updated to match new layout
- Zero new TypeScript errors introduced
