# Feature: Monthly Apiary Tasks

**Date:** 30 October 2026 · **Status:** implemented

## 1. Overview

The dashboard shows up to five jobs for the current month under the heading "{Month} in Ireland". They complement the seasonal top card ([dashboard-seasonal-lead-mockup.html](../../tasks/dashboard-seasonal-lead-mockup.html), not yet built). The text lives in a table, so it can change without a release.

## 2. Database (MCP server)

`public.monthly_apiary_tasks`, created by `supabase/migrations/20261030120000_monthly_apiary_tasks.sql` (applied as `monthly_apiary_tasks`).

| Column | Notes |
|---|---|
| `id` | uuid primary key |
| `month` | 1 to 12 |
| `position` | 1 to 5, unique within the month, which is what limits a month to five items |
| `task` | The text shown, not blank |

Reference content, the same for every user. RLS on; `authenticated` has SELECT only, `anon` has nothing. To change the wording, edit the row in the Supabase dashboard (or a migration); no client can write to it.

## 3. Display

`src/components/dashboard/SeasonalReminders.tsx` reads the current month ordered by `position`, keeps a successful answer for the page's lifetime, and shows nothing for the list on a failure. In stores months it still adds the "Your hives" scale line.

## 4. Content and sources

Written in our own words, not copied. Where sources differed, the app's agreed rules win: 15°C to open a hive, about 18 kg of winter stores. Weekly swarm checks follow Tribes, BBKA and Roe Valley. Treatments are worded as "licensed" rather than naming products, because what is licensed can change.

- [Tribes Beekeepers Association, Galway](https://tribesbeekeepersassociation.com/this-month-in-the-apiary/): the main source
- [County Louth Beekeepers' Association](https://www.louthbeekeeping.com/apiary-calendar.html)
- [Roe Valley Beekeepers](https://www.rvbka.com/beekeeping-calendar)
- [British Beekeepers Association](https://www.bbka.org.uk/the-beekeeping-year)
- [Inverness-shire Beekeepers' Association](https://inverness-shirebeekeepers.org/keeping-bees/beekeepers-calendar/)

## 5. Limits

- Calendar months, not local conditions: timing varies across Ireland and by year.
- Replaces the hard-coded list in the component, including the wording agreed for October on 29 October 2026.
- The seasonal mock-up's 7-9 day swarm check should use the same 7 days when it is built.
