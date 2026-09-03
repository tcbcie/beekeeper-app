# Varroa Treatment — Removal Tracking, Reminders and Hive Visibility

**Date:** 03/09/2026
**Status:** T1 to T5 complete, 03/09/2026. Not yet verified in a browser — that is the owner's check.
**Origin:** Support ticket, Gordon McCabe, 29/08/2026 (`suggestion`, open):

> "Would be useful to have a reminder when the desired treatment time period has past.
> Also a tick box to say it's been removed. It would be useful on the hive view to know
> what hives currently have treatments on."

## 1. The three asks are one missing fact

A `varroa_treatments` row records **one date** — `treatment_date` — and nothing else about
time. There is no end date, no removal date, no status, and no notion anywhere in the
codebase of a treatment being *in progress*. Every query, card, report and AI tool treats a
treatment as a point-in-time event.

All three requests follow from the same gap:

| Ask | What it actually needs |
|---|---|
| A reminder when the period has passed | An expected removal date |
| A tick box to say it's been removed | An actual removal date |
| Which hives currently have treatments on | Expected set, actual not yet recorded |

So this is **one small schema addition** with three surfaces, not three features. That is the
main reason to do it as one piece of work.

## 2. What already exists, and what does not

**A live reminder pipeline exists and is healthy.** pg_cron job `send-task-event-reminders`
runs every 15 minutes, POSTs to the `task-event-reminders` edge function, which emails via
Resend. **288 successful runs in the last three days**, most recently 03/09/2026 15:15 UTC. It
is driven entirely off `tasks_events` rows where
`reminder_enabled = true AND reminder_sent = false AND completed = false`. It already fans a
reminder out to team-mates on shared hives, and already dedupes via `reminder_sent`.

**Web Push does not work and must not be used.** `public/service-worker.js` has a `push`
listener, and a `push_subscriptions` table exists — but the table has **zero rows**, nothing
in the codebase ever calls `pushManager.subscribe()`, there are no VAPID keys and no sender.
It is dead code. The service worker's `notificationclick` also hard-codes navigation to
`/dashboard/batches`. A treatment reminder built on push would silently reach nobody.

**Conclusion:** the reminder is a `tasks_events` row. It then inherits the working email cron,
the Upcoming Events widget, the tasks page and the apiary Visit Checklist at no cost.

### Precedent to follow

`docs/features/inspection-follow-up-tasks.md` — the inspection form already creates
`tasks_events` rows on save, best-effort, with a warning toast if the insert fails while the
record itself still saves. This plan copies that failure model exactly.

**One deliberate departure from it.** Inspection follow-ups set `reminder_enabled = false` and
make users opt in per task. Doing that here would mean the feature does not do the thing
Gordon asked for. This plan defaults it **true** — safely, because the per-user switch
(`profiles.enable_task_email_reminders`) still gates every send, so nobody who has opted out
of reminders receives one.

## 3. The data problem that shapes the design

`varroa_treatment_products` knows durations, but not in a usable form. `treatment_duration` is
**free text**, and inconsistent across the 16 rows:

`"6-10 weeks"`, `"2-4 weeks"`, `"14 days"`, `"7 days"`, `"Single application"`,
`"Up to 4 months"`, `"Multiple applications (10 days apart)"`

Worse, `varroa_treatments.treatment_type` is a plain string, **not a foreign key**. Of the 158
live rows, **17 (11%) match no product at all** — `Formic Acid` (8), `ApiLifeVar` with no
space (8), `Oxalic Acid` (1). They were entered through the "Other" free-text path or predate
the product table.

**Therefore product lookup must be a convenience, never a correctness dependency.** The
design below prefills from the product where it can, and works identically where it cannot.

There is also a second, conflicting duration source: `src/lib/external-data.ts`
`APPROVED_TREATMENTS`, which disagrees with the database (Apistan's withdrawal period is 42
there and 0 in the table) and uses different product names. **Out of scope** — reconciling it
is a separate job, recorded in section 8.

### Not every treatment is removable

Oxalic dribbles and sublimations are single applications with nothing to take out. Apibioxal,
Bienenwohl, Oxuvar and Oxybee are all `"Single application"`. A "treatment on" indicator that
lit up for those would be pure noise. The model must distinguish "strip-type, comes out later"
from "done the moment it is applied".

## 4. Data model

Four columns. Everything else is derived.

### 4a. `varroa_treatments` — two nullable dates

| Column | Type | Null | Meaning |
|---|---|---|---|
| `planned_removal_date` | `date` | YES | When the treatment is due to come out. NULL = nothing to remove. |
| `removed_date` | `date` | YES | When it actually came out. NULL = still on, if planned. |

**"Currently on" is defined as `planned_removal_date IS NOT NULL AND removed_date IS NULL`.**

This definition matters more than it looks. Both columns default NULL, so **all 158 existing
rows are inert on day one** — no backfill, no migration of history, and no risk of every hive
in the database suddenly claiming to have a treatment on it. The feature lights up only for
treatments recorded after it ships, which is the correct and conservative behaviour.

*Overdue* is then `planned_removal_date < today AND removed_date IS NULL`.

### 4b. `varroa_treatment_products` — one numeric duration

| Column | Type | Null | Meaning |
|---|---|---|---|
| `removal_after_days` | `integer` | YES | Days from application to removal. NULL = single application, nothing to remove. |

Seeded from the existing free-text durations, taking the **lower bound** of each stated range:

| Product | `treatment_duration` | `removal_after_days` |
|---|---|---|
| Apivar | 6-10 weeks | 42 |
| Apitraz | 6-10 weeks | 42 |
| Apistan | 6-8 weeks | 42 |
| Bayvarol | 4-6 weeks | 28 |
| ApiLife Var | 3-4 weeks | 21 |
| Thymovar | 3-4 weeks | 21 |
| Apiguard | 2-4 weeks | 14 |
| Formic Pro | 14 days | 14 |
| HopGuard III | 14 days | 14 |
| Mite Away Quick Strips | 7 days | 7 |
| Polyvar Yellow | Up to 4 months | 120 |
| Apibioxal, Bienenwohl, Oxuvar, Oxybee | Single application | NULL |
| VarroMed | Multiple applications | NULL |

**Why the lower bound.** For Apivar, 6-10 weeks means the strips must stay at least six weeks
and must be out by ten. Reminding at six leaves the beekeeper the remaining four weeks as
slack; reminding at ten means any delay puts them outside the approved window, which is an
efficacy and mite-resistance problem rather than merely an untidy record. Being reminded early
is recoverable. Being reminded late is not.

The free-text `treatment_duration` column is **kept and unchanged** — it is what the product
tooltip displays, and it carries the full range that a single integer cannot.

### 4c. `tasks_events` — one link column

| Column | Type | Null | Meaning |
|---|---|---|---|
| `treatment_id` | `uuid` | YES | FK → `varroa_treatments(id)` ON DELETE CASCADE |

**Why this is needed rather than the decoupled approach.** Inspection follow-up tasks are
deliberately decoupled — editing the inspection never touches them. That is right for tasks a
user hand-writes. It is wrong here: without a link, ticking "removed" would leave the reminder
task open, and Gordon would pull his strips, record it, and *still* be emailed to go and pull
them. The link lets removal close the task, and lets deleting a treatment take its reminder
with it.

The existing batch-to-task trigger matches by `title LIKE 'Acceptance Check: %'`. That is
fragile title-based identity, and this plan will not repeat it.

All four columns are additive and nullable. No existing row changes.

## 5. User interface

### 5a. The treatment form — `VarroaTreatmentForm.tsx`

Two additions, placed directly after Treatment Date so the dates read together:

* **"Remove by"** — a date input, always present. Prefilled with
  `treatment_date + removal_after_days` when the selected product has one, and left empty
  otherwise. Always editable, and always clearable. Because it is present regardless of
  whether the product matched, the 11% of free-text products lose only the prefill.
  Recomputes if the treatment date or product changes **and the user has not typed over it** —
  once touched by hand, it is never silently overwritten.
* **"Treatment removed"** — a checkbox with a date beside it, revealing `removed_date`
  defaulted to today. Shown only when a removal date is set, because there is nothing to
  remove otherwise. This is Gordon's tick box.

The product tooltip already displays `treatment_duration` and `withdrawal_period_days` at
entry time; that stays.

### 5b. The reminder

On save, when `planned_removal_date` is set and `removed_date` is not, insert one
`tasks_events` row:

| Column | Value |
|---|---|
| `title` | `Remove {product} — Hive {hive_number}` |
| `event_type` / `category` | `task` / `treatment` |
| `start_date` | `planned_removal_date` |
| `all_day` | `true` |
| `hive_id` / `apiary_id` | from the treatment |
| `treatment_id` | the new treatment's id |
| `reminder_enabled` | `true` (see section 2) |
| `is_team_task` | `true` if the hive is shared |
| `notes` | `Auto-created from a varroa treatment recorded on {date}.` |

On edit: update the existing linked row rather than creating a second. On ticking removed:
set `completed = true`. On clearing the removal date: delete the linked row.

**Failure model, copied from inspection follow-ups.** The treatment write is the source of
truth. If the task insert fails, the treatment still saves and a single warning toast appears.
No partial rollback.

### 5c. Where the hive view shows it

This is the most contested surface in the repository and deserves stating plainly.

`docs/features/mobile-first-phase4-list-simplification-plan.md` §8 **deferred the compact list
view** precisely because `HiveListCard` is already `min-h-[280px]` with a box-stack diagram,
giving "about one hive per screen on mobile", and Phase 5 gates the re-measure on user
testing. The card carries nine pill types already. Adding a tenth runs against a recorded
finding.

I think it still earns its place, and here is the argument rather than an assertion: **the
pill is transient and actionable.** Unlike status or share pills, which are permanent chrome,
a treatment pill exists only between application and removal — for most hives, most of the
year, it renders nothing at all. It also disappears the moment the user does the thing it is
asking for. That is the opposite of the density problem Phase 4 identified, which was about
permanently-present information.

Proposed, in order of confidence:

1. **`HiveListCard` pill** — amber `Apivar — remove by 12 Oct`, red `Apivar — removal overdue`
   past the date. Joins the existing cluster.
2. **Hive detail page** — the same state on the Varroa Treatments section. **This costs
   nothing**: `useHiveDetail` already loads the full treatment history.
3. **Hives list summary bar** — the existing `"{active} Active | {archived} Archived | {n}
   Need Inspection"` line gains a treatments-on count when non-zero.

**Deferred:** the apiary map token. `HiveToken` colours its border by queenless-red versus
active-green, and a third state would clash with a marker that already carries urgent meaning.
The map is the "walking the yard" view and arguably wants this most, so it should be its own
small piece of work rather than a rushed corner dot.

### 5d. Cost of the list-wide query: zero new round trips

`useHivesList` **already fetches `varroa_treatments`** for its last-record map:

```
.from('varroa_treatments').select('hive_id, treatment_date').in('hive_id', hiveIds)
```

This becomes a `.select()` widening to include the two new dates and `treatment_type`. The
derived map is built alongside `activeTasksByHive`, and the field is attached in the existing
enrichment `map()`. **No new query, no N+1.**

Two load-bearing constraints in that file must be respected: never add `.eq('user_id', …)` to
these aggregate queries (RLS already scopes them; client filtering wrongly hid team-mates'
records and caused a real bug), and never add `.limit()` (PostgREST caps total rows, not
per-hive, so hives silently vanish from the dedupe map).

## 6. Edge cases and risks

* **A team-mate cannot record a removal.** RLS on `varroa_treatments` is asymmetric: SELECT is
  `can_access_hive(...)`, but **UPDATE and DELETE are `user_id = auth.uid()`**. So on a shared
  hive, a team-mate can see the treatment and will receive the reminder email (the cron fans
  out to shared hives), but **cannot tick it off**. This is pre-existing behaviour rather than
  something introduced here, and this feature makes it visible for the first time. Flagged
  rather than fixed — widening that policy is a permissions decision, not a UI one.
* **Timezone.** Both new columns are `date`, not `timestamptz`, matching `treatment_date`. Use
  the existing `parseLocalDate` / `toLocalDateString` helpers, never `new Date(str)`, which
  would shift the day for users behind UTC.
* **A treatment recorded retrospectively** with a removal date already in the past creates an
  immediately-overdue task. Correct — that *is* overdue — but the reminder should not fire for
  a treatment that was also marked removed in the same save. Hence the "and `removed_date` is
  not set" condition on task creation.
* **Duplicate reminders on edit.** Guarded by the `treatment_id` link: edit updates, never
  inserts a second.
* **Products whose `removal_after_days` an admin later changes** do not retro-alter existing
  treatments. The date is copied onto the record at entry, not derived at read time. This is
  deliberate: a record of what was planned at the time is what a medicines register needs.
* **The 500-row cap** on the records-page treatment fetch is pre-existing and untouched.

## 7. Regulatory note

A closed ticket from 29/03/2026 asked whether varroa treatment could "populate UK veterinary
medicine administration record". A medicines administration record wants product, batch, date
applied, quantity, animals treated **and the date treatment finished**. The form already
captures batch number "for DAFM records", and `DAFMVarroaReport` already exists.

`removed_date` is the field that report is currently missing. This plan does not change the
report, but it makes doing so later a display change rather than a data-collection problem.
Worth knowing that this work has value beyond the convenience Gordon asked for.

## 8. Out of scope

* Reconciling `src/lib/external-data.ts` against `varroa_treatment_products`. They conflict
  today; this plan neither worsens nor fixes it.
* The apiary map token (section 5c).
* A "has a treatment on" filter on the hives list.
* A dashboard "Attention Needed" chip for overdue removals — the email reminder already covers
  the nagging, and this would mean editing the dashboard RPC.
* Backfilling the 158 existing treatments. By design they stay inert.
* Web Push. It does not work; fixing it is its own project.
* The multi-select "apply a treatment to several hives at once" ticket (open, 25/07/2026),
  which is adjacent but separate.

## 9. Implementation phases

Each is independently verifiable. **Stop after T1 and confirm the migration before building on
it.**

1. **T1 — Schema.** Four columns via MCP migration; seed `removal_after_days` for the 16
   products. Verify all 158 existing rows still read as "no treatment on".
2. **T2 — Form.** "Remove by" prefill and the "Treatment removed" tick box. Types updated.
3. **T3 — Reminder.** `tasks_events` creation, update, completion and deletion on the records
   page, with the best-effort toast.
4. **T4 — Hive views.** `useHivesList` select widening, the derived map, the card pill, the
   detail-page state, the summary count.
5. **T5 — Verify.** `npx tsc --noEmit`, `npx eslint` on changed files, full suite against the
   standing baseline, then the `qa-engineer` audit. Documentation updated. **The browser check
   is the owner's.**

## 10. Database connections

All DDL through the Supabase MCP server (`apply_migration`), per repository convention. No
`.sql` files parsed or written. Run `get_advisors` after the migration.

## 11. T1 as built (03/09/2026)

Migration `add_varroa_treatment_removal_tracking`, applied via the Supabase MCP server.

**Verified after applying:**

| Check | Result |
|---|---|
| Existing treatments | 158, of which **0** read as "currently on" — `planned_removal_date` and `removed_date` are NULL on every one |
| Existing tasks | 447, of which **0** carry a `treatment_id` |
| Products seeded | **11 of 16**; the five single/multiple-application products are correctly NULL |
| FK | `tasks_events_treatment_id_fkey … ON DELETE CASCADE` present |
| Index | `idx_tasks_events_treatment_id`, partial on `treatment_id IS NOT NULL` |
| Advisors | No new security finding on any of the three tables. One new INFO: the index is unused — expected, nothing writes `treatment_id` until T3. |

### Two additions beyond what section 4 specified

**Three CHECK constraints**, following the precedent of `add_varroa_disease_range_check`
(documented in `varroa-disease-indicator.md`) that the repository already defends against
writes originating outside the form:

```
planned_removal_date IS NULL OR planned_removal_date >= treatment_date
removed_date         IS NULL OR removed_date         >= treatment_date
removal_after_days   IS NULL OR removal_after_days   > 0
```

A treatment cannot be removed before it was applied. NULL comparisons yield NULL, which a
CHECK treats as satisfied, so all 158 existing rows passed without alteration.

**An index on `tasks_events.treatment_id`.** Postgres does not index foreign keys
automatically, and `ON DELETE CASCADE` would otherwise scan the whole table on every treatment
deletion. Partial, because the column is NULL on all 447 existing rows and will stay NULL on
most.

### Note for T3

`removal_after_days` is copied onto the treatment at entry, never joined at read time. An
admin later editing a product's duration must not retro-alter treatments already recorded —
what was planned at the time is what a medicines register needs.

## 12. T2 to T5 as built (03/09/2026)

**Verification.** 0 `src` type errors, ESLint clean on all ten changed files, full suite
unchanged at the standing baseline of 18 failed files / 137 failed / 661 passed.

### Files

| File | Change |
|---|---|
| `src/lib/treatment-removal.ts` | **New.** The single definition of "still on", plus date maths and the label. |
| `src/lib/treatment-reminder.ts` | **New.** Creates, updates, closes and deletes the `tasks_events` reminder. |
| `src/types/records.ts` | `planned_removal_date`, `removed_date`, `removal_after_days`. |
| `src/types/hive.ts` | `ActiveTreatment`, `Hive.active_treatment`, two fields on `HiveVarroaTreatment`. |
| `VarroaTreatmentForm.tsx` | "Remove by" with prefill, "Treatment removed" tick box, two validations. |
| `records/page.tsx` | Reminder sync, ownership guard, new columns on write. |
| `useHivesList.ts` | `.select()` widened, `activeTreatmentByHive` map, `active_treatment` attached. |
| `HiveListCard.tsx` | The treatment pill. |
| `hives/page.tsx` | "N Treatments On" in the summary bar. |
| `hives/[id]/page.tsx` | Removal state and removed date on each treatment. |

### Departures from the plan

**The "Remove by" field sits after the product, not after the treatment date.** Section 5a
put it with the dates. In the built form the product is what causes the prefill, so placing
the field below the product means the beekeeper watches it fill in directly beneath the
control they just used, rather than in a part of the form they have already scrolled past.

**The pill went into the descriptive column, not the status cluster.** Section 5c assumed the
status cluster. That cluster's pills are short and `whitespace-nowrap`; this label carries a
product name and a date, and `Mite Away Quick Strips — remove by 12 Oct` would overflow a
320px card. It now sits with "N Active Tasks", is `w-fit max-w-full`, and wraps.

**No code was needed to delete a reminder when its treatment is deleted.** The `ON DELETE
CASCADE` from T1 does it in the database, which is why the foreign key was worth having.

### QA audit (03/09/2026)

**🟠 High — a team-mate's edit created a stray reminder they could not act on.** RLS lets a
team-mate see a treatment on a shared hive but not update it, and `TreatmentCard` offers Edit
to everyone (`TreatmentCard.tsx:62`, ungated). The update therefore matched no rows and
PostgREST reported no error, so the edit silently did nothing — pre-existing. What was new is
that the reminder sync then ran and, finding no task owned by that user, **inserted one**: a
reminder owned by someone who cannot change the treatment it points at, emailing them until
the treatment is deleted. Fixed by asking the update which rows it matched (`.select('id')`)
and stopping with *"Only the beekeeper who recorded this treatment can change it."* That also
closes the pre-existing silent no-op.

**🟡 Medium — re-opening a removed treatment left the reminder mute.** Un-ticking "Treatment
removed" set `completed = false`, but `reminder_sent` stayed `true` from the earlier send, so
the cron would never email again. `syncTreatmentReminder` now clears `reminder_sent` when a
completed reminder is re-opened, as well as when the date moves.

**🟡 Medium — three clock reads per treatment row.** The hive detail page called
`getTreatmentRemovalState` twice and `new Date()` implicitly each time; across a midnight
boundary one row could render its own state inconsistently. Derived once per record.

**Checked and clear:** `category: 'treatment'`, `event_type: 'task'` and `priority: 'normal'`
all satisfy the `tasks_events` CHECK constraints, so no reminder insert can be rejected on
those grounds — verified against the live catalogue rather than assumed.

**Not fixed, by design:** `useHivesList` derives "overdue" once per fetch, so a list left open
across midnight will not flip a pill until the next load. Recomputing on a timer would mean
re-rendering every card to change one word.

### Still to verify in a browser

1. Pick Apivar on a new treatment — "Remove by" should fill in 42 days out and say it was
   suggested from the 6-10 week duration.
2. Save it, then check Tasks for *"Remove Apivar — Hive N"* on that date.
3. The hives list should show an amber pill on that hive, and "1 Treatment On" in the summary.
4. Re-open the treatment, tick "Treatment removed", save — the pill should go and the task
   should be complete.
5. Type a product under "Other" — the "Remove by" field must still be there, just empty.
