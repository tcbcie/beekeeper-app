# Feature: Monthly Apiary Tasks

**Date:** 30 October 2026 · **Status:** implemented

## 1. Overview

The dashboard shows up to five jobs for the current month under the heading "{Month} in Ireland". They complement the seasonal top card ([dashboard-today-screen.md](./dashboard-today-screen.md)). The text lives in a table, so it can change without a release.

## 2. Database (MCP server)

`public.monthly_apiary_tasks`, created by `supabase/migrations/20261030120000_monthly_apiary_tasks.sql` (applied as `monthly_apiary_tasks`).

| Column | Notes |
|---|---|
| `id` | uuid primary key |
| `month` | 1 to 12 |
| `position` | 1 to 5, unique within the month, which is what limits a month to five items |
| `task` | The text shown, not blank, 300 characters at most |
| `updated_at` | Set by a trigger on every change; the panel's review date is the month's latest |

Reference content, the same for every user. RLS on; every signed-in user can read, only admins (`is_current_user_admin()`) can write, and `anon` has nothing. Edit rules added by `supabase/migrations/20261030190000_monthly_apiary_tasks_admin_edit.sql` (applied as `monthly_apiary_tasks_admin_edit`).

The month and position constraint is deferrable, so that one statement can swap two items when reordering.

## 3. Display

`src/components/dashboard/SeasonalReminders.tsx` reads the current month ordered by `position`, keeps a successful answer for the page's lifetime, and stays away on a failure. Below the list it names the sources and "Reviewed {Month Year}", from the month's latest `updated_at`.

## 3a. Editing (admins)

Settings, "Monthly Tasks" (`src/components/settings/MonthlyTasksManagement.tsx`): choose a month, then edit, add, delete or move items up and down. A month holds up to five; a new item takes the first free position. The month picker locks while text is unsaved.

A change appears the next time a user loads the app, as each open session keeps its list. The admin's own session is refreshed straight away. Any edit moves that month's review date, even a small one, and the source line is fixed text in the component.

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
