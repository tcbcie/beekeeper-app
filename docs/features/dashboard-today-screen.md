# Feature: Dashboard as a "Today" Screen

**Date:** 29 October 2026 · **Status:** Phase 1 implemented (seasonal reminders included)

## 1. Overview

The dashboard is the first screen a beekeeper sees. It now answers four questions, in order:

1. **Can I open my hives today?** – a clear answer with the reason and the best window, and the next five days.
2. **What should I do, and where?** – one To do list naming the hives, each with a button that starts the job.
3. **Is anything wrong?** – only exceptions appear in To do; nothing when all is well.
4. **What should I think about this time of year?** – two or three seasonal reminders for Ireland.

It replaces the earlier apiary cards, the "Today around your apiaries" strip ([dashboard-simplify-plan.md](./dashboard-simplify-plan.md)), the "Attention needed" chips and the stats strip.

## 2. Layout (top to bottom)

| Part | Content | File |
|---|---|---|
| Greeting | "Good afternoon, Rico" and "21 hives in 4 apiaries · 10 overdue for a check" | `src/app/dashboard/page.tsx` |
| Can I open my hives today? | Verdict (e.g. "Not today: too cool", "Yes, 12:00–15:00"), explanation, five day tiles, next good window, "Forecast for {apiary}" | `src/components/dashboard/InspectionWeatherCard.tsx`, rule in `src/lib/inspection-weather.ts` |
| To do | Grouped by apiary (nearest first); first five jobs, "Show all N jobs" | `src/components/dashboard/TodoList.tsx`, rules in `src/lib/dashboard-todo.ts` |
| Quick actions | New inspection / New task (unchanged; drag or tap onto an apiary row) | page |
| My apiaries | One row each: hives, oldest check, scales' change this week, "N jobs" or "All good" | `src/components/dashboard/ApiaryWeatherRow.tsx` (`variant="card"`) |
| {Month} in Ireland | Seasonal reminders, one set per month | `src/components/dashboard/SeasonalReminders.tsx` |
| Upcoming events, Recent activity, Teams | Unchanged | page |

The weather, 7-day forecast, GDD, blooms and nectar/pollen block now sits on the apiary page (`ApiaryWeatherRow` `variant="conditions"`, loaded on demand), so nothing is lost.

## 3. Inspection-weather rule (agreed with the owner)

An hour between 10:00 and 17:00 is good when it is **15°C or warmer**, **dry** (rain chance ≤ 30% and ≤ 0.1 mm) and **calm** (wind ≤ 20 km/h). For each day the card takes the longest run of good hours:

- 2 hours or more: good (green tile, "Yes, 12:00–15:00").
- 1 hour: brief (amber tile, "Only briefly, …").
- None: grey tile with the commonest problem (rain, then cool, then windy on a tie). Today after 17:00 reads "Too late today".

Data: one Open-Meteo hourly forecast (temperature, precipitation probability, precipitation, wind speed; `timezone=Europe/Dublin`, 5 days) for the nearest apiary with coordinates, cached for 30 minutes per location. Open-Meteo is already allowed by the Content Security Policy.

## 4. To do rules

`buildApiaryTodos(apiary)` is the single source for both the To do list and each apiary row's "N jobs" pill, and decides the apiary order (apiaries with jobs first, then nearest first).

| Job | Colour | Button |
|---|---|---|
| Hives not inspected for 14+ days (one line per apiary: "Inspect hives 49-HMN+, 12-MN+, 17-HMN+ +6 more", oldest date) | red | Inspect (one hive: new inspection for that hive; several: new inspection with the apiary chosen) |
| Hive marked queenless (one line per hive, with reason) | red | Open hive |
| Hive with no queen or eggs for 21 days, or broodless 21 days (one line per hive) | amber | Inspect that hive |
| Hive with a varroa check over 3% in 30 days (one line per hive, with the rate) | amber | Open hive |
| Tasks due today or earlier, rearing-batch milestones left out (first title, "and N more") | blue | Tasks (Tasks page, "Due" view, that apiary) |
| Queens over 2 years old (account-wide) | amber | Queens |

## 5. Database (MCP server)

`supabase/migrations/20261029150000_dashboard_today_screen.sql`, applied as `dashboard_today_screen`. `get_dashboard_overview` additionally returns `firstName` and, per apiary, `overdueHives`, `queenlessHives`, `queenCheckHives`, `highVarroaHives` and `dueTasks` (the hives behind the existing counts). Additive; grants unchanged (authenticated, service_role).

## 6. Seasonal reminders

Fixed text, one set per month, heading "{Month} in Ireland". October's wording was agreed with the owner; the other months follow the same style and should be checked by the owner.

## 7. Edge cases

- **No apiary with coordinates:** no forecast card.
- **Forecast fails:** "The forecast is not available right now." (retried on the next visit).
- **No jobs:** "Nothing urgent: every hive checked in the last 14 days and no tasks due."
- **Older cached payload without the hive lists:** read as empty lists; nothing crashes.
- **A hive both overdue and queenless** appears in both jobs: both need doing.

## 8. Phase 2: scale alerts (implemented 29 October 2026)

Two scale alerts join the To do list, with thresholds agreed with the owner (`src/lib/scale-alerts.ts`):

| Alert | Rule | Line |
|---|---|---|
| Possible swarm (red) | 1 April – 31 July: the scale lost **1.5 to 5 kg within 3 hours** in the last 48 hours, and at least half of it still missing at the latest reading (over 5 kg is a super taken off; a drop that comes back is an inspection) | "Hive 26-DA: possible swarm · lost 2.1 kg within 3 hours, Tuesday afternoon" [Inspect] |
| Getting light (amber) | All year: **−2 kg or more in 7 days** (Mel's "may need feeding" rule). Wolf ignores feeding/harvest jumps; BEEP cannot | "Hive 34-DA getting light · −2.7 kg in 7 days, check stores" [Open] |

- **No extra vendor calls:** both summary routes (`/api/beep/data`, `/api/wolf-waagen/data`) now also return `largestDrop3h` (`{ kg, at, stillDownKg }`), worked out from the 48 hours of readings they already download.
- **Loaded once:** `src/hooks/useScaleSummaries.ts` fetches every scale summary when the dashboard opens (5-minute cache per scale) and shares them with the To do list and the apiary rows; the rows no longer fetch their own.
- **Hive numbers:** `get_dashboard_overview` adds `hiveNumber` to each scale (`supabase/migrations/20261029170000_dashboard_scale_hive_number.sql`, applied as `dashboard_scale_hive_number`; grants unchanged).
- The alerts appear once the summaries arrive; the "N jobs" pill and apiary order update with them, as both use `buildApiaryTodos(apiary, scales)`.

### Seasonal reminders linked to the user's hives (29 October 2026)

In stores months (September to February, and June for the June gap) the seasonal panel adds **"Your hives · Scales this week: 34-DA -2.7 kg, 26-DA -2.1 kg, 29-DA +1.3 kg"**, every scale hive's 7-day change with the fastest-losing first. It uses the scale summaries already loaded (`useScaleSummaries`), so it costs no request and no database change. The owner chose this line only; lines for feeding and varroa-treatment records were offered and not taken.

Related: [dashboard-simplify-plan.md](./dashboard-simplify-plan.md), [dashboard-apiary-weather.md](./dashboard-apiary-weather.md), [gdd-dashboard-bloom.md](./gdd-dashboard-bloom.md).
