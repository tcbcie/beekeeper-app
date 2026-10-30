# Feature: Apiary Visit Plan

**Date:** 30 October 2026 · **Status:** Implemented, phase 2 of [dashboard-brief-plan.md](./dashboard-brief-plan.md)

## Overview

Before a visit, the beekeeper needs one place that says what to do at this apiary. The apiary page now opens with **Jobs here**, and each apiary heading in the dashboard's To do list has a **Plan visit** link to it.

## Jobs here

`src/components/dashboard/ApiaryJobs.tsx`, data from `src/hooks/useApiaryJobs.ts`.

- **Record and scale jobs:** the dashboard's own rules (`buildApiaryTodos`), so both screens agree. Read from `get_dashboard_overview`, which only returns the user's own apiaries, so a shared apiary shows its tasks only.
- **Open tasks:** every open task for the apiary, soonest first, not only those due. Rearing-batch milestones are left out, as on the dashboard.
- **Done button:** marks a task complete from the page. A task blocked by RLS returns no rows, so this is checked and reported.
- **Treatment removal tasks have Open, not Done.** They close when the removal is recorded. Ticking one alone would leave the hive showing as under treatment, and a later edit of the treatment would reopen it.
- **Visit checklist button:** opens the existing checklist on the Tasks page for this apiary (`/dashboard/tasks?apiary=ID&checklist=true`). See [visit-checklist-redesign.md](./visit-checklist-redesign.md).
- **Visit window:** in spring and swarm season, the next good day at this apiary by the inspection-weather rule, worded "may suit a visit", with the time the forecast was checked. Cached as in `useInspectionForecast`.
- **Failure:** if anything fails to load the page says the list may be incomplete, and never shows "Nothing to do here".

## Hive rows

Each active hive shows its last inspection, and "Treatment on: {type}, removal due {date}" when a treatment has a planned removal and no removal recorded (`src/hooks/useApiaryDetail.ts`). A treatment with no planned removal is not shown as active.

Last inspections come from the apiary's latest 500 inspections. A hive with none in that list shows no line, rather than a claim that it was never inspected.

## Differences from the plan

- **Done button on the apiary page only.** The dashboard's To do shows one summary line per apiary for tasks, so there is no single task to tick there.
- **The visit window is on the apiary page, not the dashboard heading.** It then uses that apiary's own forecast, and the dashboard's top card already names the next good day.

## Database

No change.

Related: [dashboard-today-screen.md](./dashboard-today-screen.md).
