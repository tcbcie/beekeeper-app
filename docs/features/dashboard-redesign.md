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
4. **Stats + Quick Actions** — compact inline stats strip + 6 action chips in one Panel
5. **Upcoming Events** — tomorrow through 7 days out (today filtered out, hidden when empty)
6. **Recent Activity** — 5 most recent records with apiary name shown
7. **Teams & Collaboration** — collapsed accordion combining shared stats, teams, rearing groups
8. **Version Footer**

## Key Changes
- **Attention banner promoted** from position 5 to 2, with new "tasks due today" chip
- **StatCards replaced** with compact inline strip (icon + label + bold number, horizontal scroll on mobile)
- **Inspect button removed** from apiary cards — was a nested interactive element inside a `<Link>` (accessibility anti-pattern)
- **UpcomingEvents** filters today's items (already in attention banner), hides when empty, has "View All Tasks" link
- **Recent activity** now shows apiary name via `hive → apiary` join
- **4 team/group sections** combined into one collapsible accordion, default collapsed
