# Feature: Tasks & Events — Mobile Triage

**Date:** 04/09/2026
**Status:** Implemented — awaiting browser verification by the owner
**Task record:** `tasks/tasks-mobile-triage-todo.html`
**Programme:** Mobile-first over-50 UX remediation. The Tasks screen was never
assigned to a phase; see section 8.

## 1. The complaint

> Opening the task functionality on a mobile device is overwhelming when there
> are a lot of tasks. It is not clear what the priority is. There is no
> prefiltering. There is just a lot of scrolling, and the user will lose
> interest before looking at every task.

Every clause of that is measurable, and the measurements are worse than the
complaint suggests.

## 2. Evidence

Read-only queries against the live database (19 accounts holding tasks).

| Measure | Value |
|---|---|
| Incomplete items across all accounts | 160 |
| …already past their date | **153 (96%)** |
| …due today | 1 |
| …in the future | 6 |
| …that are auto-generated queen-rearing milestones | **116 (72%)** |
| …that are anything else | 43 |
| …marked `high` or `urgent` | **92 (58%)** |
| …carrying a description (avg 65 characters) | 129 |
| Busiest account | 51 incomplete, 46 overdue, 44 of them `event` rows |
| Worst account | 34 incomplete, **all 34 overdue by 90+ days** |

So the screen is not a task list. It is a 96%-overdue archive, sorted so that
the stalest item is at the top, with no word anywhere on it saying "overdue".

## 3. Root causes

### RC1 — The screen opens on filters, not on work

`page.tsx:751` renders the filter card as
`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`. On a phone that is one column:
five stacked `SelectField`s (six for team members), each a 20px `FieldLabel` plus
a `min-h: 3rem` `fj-control`, at `gap-4`.

```
5 × (20px label + 4px + 48px control) + 4 × 16px gap  = 424px
+ "Filters" header (~40px) + Card padding (~32px)     = 496px
```

Against a 390 × 844 phone with the app header and bottom navigation, that is
most of the first screen. **No task is visible on first paint.** Hives and
Records both had this and both were fixed in Phase 4; Tasks was missed.

### RC2 — The screen has no notion of "due"

`filteredTasks` (`page.tsx:496`) is a plain `.filter()` over the fetch order,
which is `.order('start_date', { ascending: true })`. There is no sort control
and no re-sort. Consequences:

* The **top of the list is the most neglected item**, and today's work is at the
  bottom after 150+ cards.
* **Nothing on any card says a task is late.** The concept exists twice in this
  codebase already — `getOverdueTasks` in `src/lib/ai/tools/tasks.ts:70`
  (`completed = false AND start_date < today`, returning `daysOverdue`) and
  `alerts.todayTasks` in `src/sql/create_dashboard_rpc_functions.sql`. Neither
  ever reached this screen. Mel can tell a beekeeper they have 46 overdue tasks;
  the Tasks page cannot.

### RC3 — Three quarters of the list is machine-generated calendar noise

`sync_batch_dates_to_tasks()` (`migrations/create_batch_events_trigger.sql`)
fires on `rearing_batches` and writes **four rows per batch**:

| Title | `event_type` | `category` | `priority` |
|---|---|---|---|
| `Acceptance Check: {batch}` | `event` | `queen_rearing` | `high` |
| `1st Cage Option: {batch}` | `event` | `queen_rearing` | `high` |
| `2nd Cage Option: {batch}` | `event` | `queen_rearing` | `high` |
| `Expected Emergence: {batch}` | `event` | `queen_rearing` | `normal` |

They are informational milestones with **no completion path** — nothing ever
ticks them — so they accumulate permanently. 116 of the 160 incomplete rows are
these. A beekeeper running twenty batches a season carries eighty permanent
red-flagged entries that were never theirs to do.

They are cleanly separable: **all 116 carry a non-null `batch_id`**, and all are
`event_type = 'event'`.

### RC4 — Priority shouts on 58% of the list

`page.tsx:887` renders the priority badge unconditionally, `normal` and `low`
included. Combined with RC3, "HIGH" is on more than half of every screen, so it
carries no information. The Visit Checklist already gets this right
(`page.tsx:1432` hides `normal`); the main list does not.

### RC5 — Cards are tall

A single card can carry six badges wrapping over three lines, then a
description, an equipment line, a date row, and up to three association chips —
roughly 200px on a phone. Fifty-one incomplete tasks is about fifteen screens of
scrolling.

### RC6 — No search

Phase 4 added search to Hives and Records. Tasks has none, so a known task can
only be reached by scrolling.

## 4. What already exists and will be reused

Nothing below is invented. Every piece has a house pattern.

| Need | Existing pattern |
|---|---|
| Collapsed secondary filters | `src/components/ui/FilterDisclosure.tsx` — `activeCount`, `storageKey`, `onClear`; unmounts children so collapsed selects leave the tab order |
| Preset row with counts, left visible | `src/components/records/RecordFiltersBar.tsx:99-146` — the time-period pills, each carrying its own count |
| Active-count + Clear | `hives/page.tsx:483-496` (`activeFilterCount`, `clearCollapsedFilters`) |
| Search | `hives/page.tsx:604` — inset `Search` icon, `TextInput`, `paddingLeft: '2.25rem'`, ephemeral `useState`, no debounce |
| Priority ordering | `src/components/UpcomingEvents.tsx` — `PRIORITY_ORDER = { urgent: 0, high: 1, normal: 2, low: 3 }` |
| "Overdue" wording and tone | `crm/orders/page.tsx:394,544` — red count in a summary line, `<Badge tone="red">Overdue</Badge>` |
| Overdue definition | `src/lib/ai/tools/tasks.ts:70` — `completed = false AND start_date < today` |
| Filter persistence | `usePersistentState`, keys shaped `page:name`, cleared on sign-out |

Two conventions are followed rather than re-litigated: **search text is
ephemeral and never persisted, filters are persisted**; and **apiary and hive
selections go through `useSelection`, not per-page storage**, because they are
shared app-wide (Phase 4, section 5D).

## 5. Design

### T1 — Triage presets, always visible, carrying counts

Replaces the Status select. Styled exactly as the Records time-period pills, in
a `flex flex-wrap gap-2` row directly under the header.

| Pill | Predicate |
|---|---|
| **Due now** *(default)* | `!completed && start_date <= today` |
| This week | `!completed && today < start_date <= today + 7` |
| Later | `!completed && start_date > today + 7` |
| Done | `completed` |
| All | everything fetched |

Counts are computed under the *other* active filters, the way `timePeriodCounts`
already is on Records, so the number on a pill is what tapping it will give.

Persisted as `tasks:view` with a **membership** validator, not a type check —
Phase 4 recorded that the Records validator only checks `typeof === 'string'`,
so a retired enum value would pass and fall through to a default branch.

This is the prefiltering that is missing. The default answers "what do I need to
do", and the counts answer "what is the priority" before anything is tapped.

### T2 — Sort by urgency, not by age alone

Within whichever preset is active: `start_date` ascending, tie-broken by
`PRIORITY_ORDER`. One shared constant, promoted out of `UpcomingEvents.tsx` so
the dashboard widget and the list agree.

### T3 — Say "overdue"

On an incomplete card whose `start_date` is before today, the date line turns
red and reads `Overdue — 12 days`, using the same definition as
`getOverdueTasks` so the AI assistant and the screen tell one story. A card
dated today reads `Today`. This is one line of the card, not a new badge.

### T4 — Quieten the badges

* Priority badge **only when `high` or `urgent`** — the Visit Checklist rule,
  applied to the main list.
* Type badge **only when the row is not a plain `task`**.
* The `📧 Email Reminder` badge comes off the card. It applies to 13 of 160
  rows, it is a setting rather than a property of the work, and it is visible in
  the edit form.

A typical card goes from four to six badges down to none or one.

### T5 — Collapse the secondary filters

The whole filter `Card` becomes a `FilterDisclosure` with
`storageKey="tasks:filtersOpen"`, an active count and **Clear filters**.
Inside, in one `flex flex-col sm:flex-row sm:flex-wrap gap-3`: Type, Category,
Ownership, Apiary, Hive.

Apiary and Hive keep routing through `useSelection`, and **are** included in the
active count — an apiary chosen on the Hives screen would otherwise silently
shorten this list with no visible cause, which is the exact failure the count
badge exists to prevent.

First screen goes from ~496px of filters to a single 48px control.

### T6 — Search

Ephemeral `useState`, no debounce, matching title, description, notes and
equipment. Placeholder: `Search tasks, notes or equipment`. Empty-state copy
follows the existing shape: `No tasks match your search.`

### T7 — Deep-link safety

`UpcomingEvents` links to `/dashboard/tasks?task=<id>` for items **1 to 7 days
out**. With **Due now** as the default those rows are filtered out, and the
existing scroll-to-highlight effect is guarded by
`filteredTasks.some(t => t.id === highlightedTaskId)` (`page.tsx:646`) — so it
would silently do nothing and the beekeeper would land on a screen that does not
contain the task they tapped.

Therefore: **applying a `?task=` deep link also sets the preset to `All`.**
`?hive=` and `?apiary=` need no override; they set the shared selection and
should still respect the date preset.

## 6. Decision taken: the 116 batch milestones

**What to do about the 116 batch milestones.** They are 72% of the incomplete
list, they are all flagged `high`, and none of them can ever be ticked off. Any
amount of filtering and sorting is fighting this. Three options:

**(a) Leave them, rely on the Type filter.** Zero risk. But the default view
stays three-quarters noise, which is the complaint. The Type select already
exists and already defaults to "All Types"; it has evidently not been enough.

**(b) Default the primary view to tasks and reminders, with an always-visible
`Batch milestones (n)` pill in the preset row.** ***Chosen by the owner, 04/09/2026,
and implemented as `includeBatchMilestones` (persisted at `tasks:milestones`,
default off).*** Nothing is
hidden — the count is on screen at all times, which is the standard this
codebase already set for collapsed filters — and one tap brings them back. The
default view drops from 160 items to 43. Small, contained, entirely client-side.

**(c) Give the milestones a real completion path** so they leave the list once
the batch passes them. Correct in principle, and the only option that actually
stops the accumulation. But it is a queen-rearing change touching a database
trigger, and it is a much larger piece of work than this one. Recorded as a
follow-up, not done here.

## 7. Edge cases and risks

* **A stale `tasks:view` value.** Validated by membership, not type (§5, T1).
* **`Due now` can legitimately be empty.** With 6 future items across the whole
  estate, a tidy account will land on an empty screen. The empty state must name
  the preset — "Nothing due now" with the other counts still visible on their
  pills — not the generic "No tasks or events found", which would read as data
  loss.
* **The 12-month fetch window.** `fetchTasks` is bounded to
  `start_date >= today - 1 year`, `.limit(1000)`. Search and the `All` pill
  cannot find what was never fetched, and the pill counts are counts of the
  fetched set. Same honesty limit Phase 4 recorded for the Records 500-row cap.
  Not widened here.
* **The Visit Checklist must not change.** `checklistTasks` deliberately ignores
  every page filter (`visit-checklist-redesign.md`); it must keep ignoring the
  new preset too. The new preset therefore goes nowhere near `checklistTasks`.
* **`openChecklist` reads `filterApiary`.** It seeds the modal's apiary picker
  from the page filter. That still works with apiary inside the disclosure.
* **Counts must be computed under the other filters**, or a pill will promise
  ten items and deliver two.
* **Two `usePersistentState` keys are added** (`tasks:view`,
  `tasks:filtersOpen`) and one (`tasks:status`) is retired. A returning user
  carries a stale `tasks:status`; it is simply no longer read.

## 8. Where this sits in the programme

`mobile-first-over-50-ux-remediation-plan.md` §12 records Phase 4 as closing
*"Hives and Records are difficult to scan"* with search, counted
`FilterDisclosure` panels and primary presets left visible. **The Tasks screen
was never in any phase** — Phase 4 covered Hives and Records, Phase 5 is the
dashboard. This is the same pattern extended to the third list screen, which is
why nothing here is a new component.

## 9. Scope

**In scope:** T1–T7, all inside `src/app/dashboard/tasks/page.tsx`, plus
promoting `PRIORITY_ORDER` to a shared constant.

**Out of scope:**
* Giving batch milestones a completion path (§6 option c).
* Widening the 12-month / 1000-row fetch window.
* Task assignment to team members — there is no `assigned_to` column; the team
  document lists it as a future enhancement.
* Recurrence — the columns exist and nothing writes them.
* A calendar or month view.
* **Known defect, recorded not fixed:** `records/page.tsx:1141` writes
  `category: 'Treatment'` (capital T) on the varroa-check path, which violates
  `tasks_events_category_check` and fails. Already noted in
  `bulk-apply-treatment-feeding-plan.md:158-160`.
* Consolidating the three overlapping task types (`HiveTask` in
  `src/types/hive.ts`, the local `TaskEvent`, the local `UpcomingEvent`).

## 10. Database connections (MCP server)

**None.** Every change is client-side. No schema, RLS policy, RPC, trigger or
index is altered. The existing `idx_tasks_events_user_start_date` already covers
the fetch, and the live schema was read only to produce section 2.


## 11. Outcome

Implemented as planned. Full record, including the before/after mobile mock-up and
the browser checks that still need doing, in `tasks/tasks-mobile-triage-todo.html`.

### First audit pass — defects in the first draft

Recorded so they are not reintroduced.

* **The deep link silently undid the whole fix.** The first draft had a `?task=`
  link call `setView('all')` and `setIncludeBatchMilestones(true)`. Both are
  *persisted*, so one tap on a dashboard event would have permanently reset the
  preset to "All" and switched the milestones back on — restoring the exact
  160-row list this work exists to avoid, with nothing to tell the beekeeper why.
  Fixed by leaving both preferences untouched and having `filteredTasks` admit the
  highlighted row directly. Section 5's T7 as originally written was wrong, and the
  corrected rule is: **a deep link widens the result, never the saved preference.**
* **The milestone pill lied whenever any other filter was set.** The count ignored
  apiary, hive, ownership, search and the active preset — the precise failure
  section 7 warns about for the preset counts, committed one paragraph after
  writing the warning. Fixed by extracting `passesFilters` and counting milestones
  that pass it *and* the current preset. This also fixed a second bug: in the Done
  view the count was always zero, so the pill disappeared while still suppressing
  completed milestones with no way to bring them back.
* **Ad-hoc date arithmetic** in `dueLabel`, replaced with the existing
  `differenceInCalendarDays` / `parseLocalDate` helpers.

### Verification

`tsc --noEmit` reports zero errors under `src/`. `next lint` on the three changed
files reports three `exhaustive-deps` warnings, all confirmed pre-existing by
stashing and re-running against `main` — one now lists fewer missing names than
before, and none were added. The suite shows 137 failures across 18 files, which is
byte-for-byte the pre-existing baseline recorded in
`mobile-first-over-50-ux-remediation-plan.md` §12; passing tests went 661 → 668,
those seven being the new `tests/lib/task-triage.test.ts`. The typography ratchet
passes, so no sub-14px text was added. The preset pills inherit `min-height: 3rem`
from `:where(.fj-btn)`, which `px-3 py-1.5` does not override.

Per repository rule the build was not run; the owner tests it.

### Correction to section 9

One new test file was added — `tests/lib/task-triage.test.ts`, seven cases over the
pure functions in `src/lib/task-triage.ts`. The date boundaries and the "1 day"
singular are the easiest things here to break silently, and the module has no
dependencies to mock.

### Second audit pass — defects in the implemented code

A second independent audit was run over the finished code. Two findings mattered.

* **The ownership filter could apply with no control on screen.**
  `tasks:ownership` is persisted, but its `<select>` renders only when
  `isTeamMember`, and `activeFilterCount` counts it only when `isTeamMember` —
  while the predicate itself ran unconditionally. A beekeeper whose team access
  ends keeps a stored `'team'`, which excludes every row they own: an empty
  list, no visible control, nothing on the Filters badge, no way to clear it.
  The new preset-aware empty state makes it read as data loss rather than as a
  filter. Fixed by gating the predicate on `isTeamMember` too, so **the filter,
  its control and its count can never disagree**. Structurally pre-existing, but
  newly reachable in a form that lies to the user.
* **The deep-linked row stayed pinned forever.** `highlightedTaskId` is set on
  arrival and never cleared. That was cosmetic before this work. It is not now:
  the fix for the first pass's critical finding has `filteredTasks` *inject*
  that row whatever the preset, so it became a task permanently wedged into
  every later view, undismissable short of a reload. Fixed by treating the
  highlight as spent once the beekeeper steers the list themselves — changing
  preset, toggling milestones or clearing filters all release it. This was a
  second-order defect of the first pass's own fix.
* **`role="group"` mislabelled the milestone toggle**, which filters by what a
  row is rather than when it is due. Moved out of the group. The first attempt
  used `display: contents` on the wrapper and was rejected: that property has a
  history of dropping the element carrying the role out of the accessibility
  tree, which would have removed the very label it was added to provide.
* **A guard that did not guard.** `dueLabel` floored its day count with
  `Math.max(1, …)`, but `parseLocalDate` yields an Invalid Date for anything
  that is not a `YYYY-MM-DD` prefix and `Math.max(1, NaN)` is `NaN` — so the
  floor passed NaN to the card as "Overdue — NaN days". Now an explicit
  `Number.isFinite` check falling back to the bare word "Overdue".
* **`PRIORITY_ORDER` was exported mutable** — harmless while private to
  `UpcomingEvents`, less so now a stray write would reorder the dashboard widget
  too. Frozen and typed `Readonly`.
* **The inactive milestone pill dimmed an interactive control**
  (`text-text-secondary`) while its four neighbours used `text-foreground`. For
  an audience of 50+ with reduced eyesight a control should not be the faintest
  thing in its own row. Matched to the others.

Re-verified after both passes: zero `tsc` errors under `src/`, the same three
pre-existing `exhaustive-deps` warnings and no others, and the suite unchanged at
137 failures across 18 files with 668 passing.
