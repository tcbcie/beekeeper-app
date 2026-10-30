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
| Greeting | "Good afternoon, Rico" and "21 hives in 4 apiaries · 1 apiary not visited for 14 days" | `src/app/dashboard/page.tsx` |
| Quick actions | New inspection / New task. On touch, tapping scrolls to My apiaries to choose one; with no apiary it opens the form | page |
| Strong wind warning | Only when gusts of 90 km/h or more are forecast at an apiary in the next 72 hours. See [dashboard-wind-warning.md](./dashboard-wind-warning.md) | `src/components/dashboard/WindWarningCard.tsx` |
| Seasonal top card | One question for the season, its answer from the user's records, and one action. See section 3a | `src/components/dashboard/SeasonalLeadCard.tsx`, rules in `src/lib/seasonal-lead.ts` |
| To do | Grouped by apiary (nearest first); first five jobs, "Show all N jobs" | `src/components/dashboard/TodoList.tsx`, rules in `src/lib/dashboard-todo.ts` |
| My apiaries | One row each: hives, last visit, scales' change this week, "N jobs" or "All good" | `src/components/dashboard/ApiaryWeatherRow.tsx` (`variant="card"`) |
| {Month} in Ireland | Seasonal reminders, one set per month | `src/components/dashboard/SeasonalReminders.tsx` |
| Upcoming events, Teams | Unchanged | page |
| Recent visits | Records grouped by day and apiary ("25 October · AP01 - Colm: 3 feeds, 1 inspection"), latest five; links to the records list for that apiary | page, `get_recent_activity` |

The weather, 7-day forecast, GDD, blooms and nectar/pollen block now sits on the apiary page (`ApiaryWeatherRow` `variant="conditions"`, loaded on demand), so nothing is lost.

## 3a. Seasonal top card (30 October 2026)

Replaces the "Can I open my hives today?" card, which said "not today" for much of the year. The card asks one question per season (`src/lib/seasons.ts`):

| Season | Band | Question | Answered from | Forecast |
|---|---|---|---|---|
| August to October | Getting ready for winter | Are they ready for winter? | Scales this week and last feed; varroa treatment since 1 July per apiary; mouse guards in October | No |
| November to February | Winter: nothing to do | Do they have enough food? | Hives getting light; other scale hives; hives without a scale and the last feed | No |
| March to April | First look of the year | Have they come through winter? | Apiaries inspected this year; the next good day | Yes |
| May to July | Swarm season | Are any about to swarm? | Possible swarms; apiaries by days since their last inspection, due after 7 days | Yes |

- `get_dashboard_overview` adds `lastFeedDate` and `lastTreatmentDate` per apiary (`supabase/migrations/20261030140000_dashboard_seasonal_lead.sql`, applied as `dashboard_seasonal_lead`; grants unchanged).
- Forecast only in spring and swarm season: autumn and winter make no forecast request (`src/hooks/useInspectionForecast.ts`).
- Each row can carry its own link instead of a pill ("Record feed", "Record treatment"). Autumn and winter have no full-width button, because one action cannot answer every row; spring and swarm season keep theirs. Mouse guards left the card, as the monthly list already covers them.
- Scale alerts appear in both the card and the To do list, so the To do count always equals the apiary pills added up. Queens over 2 years old are an uncounted note below the list, as they are advice for next season.
- Until the scale figures arrive the answer reads "Checking your scales…", so it never claims all is well on missing data.

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
| March to October: apiary with no record of any kind for more than 14 days ("Visit Home · last visit 20 days ago"). Off from November to February, when beekeepers rightly stay away; the greeting then makes no claim about visits | red | Inspect (new inspection with the apiary chosen) |
| Hive marked queenless (one line per hive, with reason) | red | Open hive |
| March to October: hive opened in the last 21 days with no queen or eggs seen in that time, or broodless 21 days (one line per hive). A hive left closed is deliberate and is not listed | amber | Inspect that hive |
| Hive with a varroa check over 3% in 30 days (one line per hive, with the rate) | amber | Open hive |
| Tasks due today or earlier, rearing-batch milestones left out (first title, "and N more") | blue | Tasks (Tasks page, "Due" view, that apiary) |

Every job shows where it comes from, before its detail (30 October 2026): **Recorded** (the user entered it), **Scale** (a device measured it), **Task** (scheduled) or **Suggested** (the app is inferring). A missing record is never worded as a problem.

### Why per apiary, not per hive (owner's decision, 30 October 2026)

A beekeeper who visits an apiary and leaves a hive closed does so on purpose, so hives skipped on a visit are never listed or counted. "Oldest check" was removed because one such hive set the figure for the whole apiary. The dashboard now reports the **last visit**: the latest record of any kind at the apiary (inspection, feeding, varroa treatment or check, harvest), from `lastVisitDate` (`supabase/migrations/20261030090000_dashboard_last_visit.sql`, applied as `dashboard_last_visit`). `overdueHives`, `oldestInspectionDate`, `uninspectedHiveCount` and `overdueInspectionHiveCount` are still returned but no longer shown.

## 5. Database (MCP server)

`supabase/migrations/20261029150000_dashboard_today_screen.sql`, applied as `dashboard_today_screen`. `get_dashboard_overview` additionally returns `firstName` and, per apiary, `overdueHives`, `queenlessHives`, `queenCheckHives`, `highVarroaHives` and `dueTasks` (the hives behind the existing counts). Additive; grants unchanged (authenticated, service_role).

## 6. Monthly tasks

At most five jobs for the month, heading "{Month} in Ireland", read from the `monthly_apiary_tasks` table. See [monthly-apiary-tasks.md](./monthly-apiary-tasks.md).

## 7. Edge cases

- **No apiary with coordinates:** no forecast card.
- **Forecast fails:** "The forecast is not available right now." (retried on the next visit).
- **No jobs:** "Nothing urgent: every apiary visited in the last 14 days and no tasks due."
- **Older cached payload without the hive lists:** read as empty lists; nothing crashes.

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
