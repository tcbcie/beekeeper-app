# Feature: Simpler Dashboard That Tells You What to Do

**Date:** 29 October 2026 · **Status:** implemented (Step A + Step B)

## 1. Overview

The dashboard's apiary cards repeated the same weather, GDD, forage, nectar/pollen and foraging window on every card (apiaries a few kilometres apart share them), used cryptic lines, and described rather than directed: "Last inspected" showed the *most recently* inspected hive, so a neglected hive could hide behind a recent visit.

**Step A – simplify**
- **A1 "Today around your apiaries" strip** above the cards: weather, 7-day forecast, flying weather, nectar/pollen, GDD and what is in bloom, for the nearest apiary with coordinates (name order without GPS). Cards drop those rows. A card more than 20 km from the strip's apiary keeps its own rows.
- **A2 plain wording:** "Flying weather: 2.8 h today · 0.3 h tomorrow" (yesterday dropped), "In bloom:", scale row "Scale change (kg), average of N" with "24 hours / 7 days / 30 days", matching the Scale Overview card.
- **A3 task count fixed:** the card shows *tasks due* (open, start date today or earlier, rearing-batch milestones left out), which is exactly the Tasks page "Due" view, and links to `/dashboard/tasks?apiary=…&view=due`. The Tasks page now applies `?view=` and clears a remembered hive filter when it arrives from this link. Previously the pill counted future tasks too, but the Tasks page opened on "Due", so "6 tasks" could open a shorter list.
- **A4 tap areas:** 48px for the 7-day toggle, bloom chips (small pill inside a 48px target), "+N more" and tasks due. Loading skeleton shows 2 quick actions (was 6).

**Step B – add value**
- **B1 "Needs attention" line per card:** hives due for inspection (14+ days or never), queen issues (existing summary), hives with high varroa (> 3% in 30 days), tasks due. Green "All good · queens seen N days ago" when there is nothing.
- **B2 "Oldest check":** days since the *least recently* inspected hive was checked ("Never" if a hive has no inspection).
- **B3 order:** cards needing attention first; within each group nearest-first (as before), the sort is stable.

## 2. Scope & Simplicity

| File | Change |
|---|---|
| `supabase/migrations/20261029120000_dashboard_apiary_attention.sql` | `get_dashboard_overview` gains per-apiary `oldestInspectionDate`, `uninspectedHiveCount`, `overdueInspectionHiveCount`, `highVarroaHiveCount`, `dueTaskCount`. Additive: every existing key kept. Applied through the Supabase MCP server; grants unchanged (authenticated, service_role). |
| `src/types/dashboard.ts` | The new fields, optional (an older cached payload can lack them). |
| `src/components/dashboard/ApiaryWeatherRow.tsx` | `variant: 'card' \| 'conditions'` and `showConditions`; the weather/forecast/forage rows are one `conditionsBlock` used by both; attention line and three facts (hives, oldest check, tasks due) replace the stats row; wording and tap areas. |
| `src/app/dashboard/page.tsx` | Strip above "My Apiaries", attention-first order, 20 km rule, skeleton fix. |
| `src/app/dashboard/tasks/page.tsx` | Applies `?view=` with `?apiary=` (once), clearing a remembered hive filter. |

## 3. Technical Design

- The strip is the same component with `variant="conditions"`: it reuses the weather, GDD and bloom fetches and their module caches, so the card for the same apiary costs no second request. It loads at once (top of page) and makes no scale calls.
- Cards that do not show their own conditions skip the GDD and bloom lookups entirely (fewer requests than before); they still fetch the weather for the header temperature.
- Attention rules mirror the account-wide "Attention Needed" alerts: overdue = no inspection in the last 14 days; high varroa = a check over 3% in the last 30 days.

### Database Connections (MCP Server)

`apply_migration` `dashboard_apiary_attention`; verified on the owner's account (e.g. AP03: latest inspection 19 October, but 9 of 10 hives overdue and the oldest check 28 August). Security advisors: nothing new.

## 4. Edge Cases & Risks

- **No GPS:** strip uses the first apiary (name order) with coordinates.
- **No apiary has coordinates:** no strip; cards have no weather anyway.
- **Apiary far away (> 20 km):** its card keeps its own weather and forage rows.
- **Quick action selected:** the strip is hidden (not a drop target); cards behave as before.
- **Old payload without the new fields:** counts read as 0 and "oldest check" falls back to the latest inspection.
- **Tasks page filters** for type, category and ownership are still remembered, so a user who narrowed those can see fewer tasks than the count.

Related: [dashboard-apiary-weather.md](./dashboard-apiary-weather.md), [gdd-dashboard-bloom.md](./gdd-dashboard-bloom.md), [dashboard-redesign.md](./dashboard-redesign.md).
