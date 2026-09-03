# Apply a Treatment or Feeding to Several Hives at Once

**Date:** 03/09/2026
**Status:** Built 03/09/2026. Not yet verified in a browser — that is the owner's check.
**Origin:** Support ticket, Gordon McCabe, 25/07/2026 (`suggestion`, open):

> "I was treating for varroa recently. Now you have the multi select. It would be great to
> select a bunch of hives and apply a treatment or feed etc."

## 1. The data already proves the case

This is not a convenience request. The live database shows the work being done by hand:

| Date | Record | Hives |
|---|---|---|
| 15/08/2026 | Apivar | **17** |
| 23/08/2026 | Sugar Syrup (2:1) | **14** |
| 19/08/2026 | Sugar Syrup (2:1) | 13 |
| 23/07/2026 | Apivar | 12 |
| 25/08/2026 | Apivar | 9 |

And the transcription drift is visible. On 15/08/2026 the seventeen Apivar rows carry four
"different" dosages: `10 mil` ×11, `2 strips` ×4, `10ml` ×1, `10mil` ×1. **Thirteen of those
are one dosage spelled three ways** — the signature of typing the same thing seventeen times.
Bulk entry removes that class of error outright, which matters because `dosage` is free text
that feeds the DAFM medicines report.

## 2. A safety defect that must be fixed first

`hives/page.tsx:169` carries this comment:

> "Only act on the user's own hives that are still loaded — RLS rejects writes to others'
> hives, and a hive hidden by a filter change should not be touched."

Line 171 does not implement it:

```ts
const selectedOwnedHives = hives.filter(h => selectedIds.includes(h.id) && h.user_id === userId)
```

It filters `hives`, the **raw fetched list**, not `filteredHives`. So a hive hidden by the
search box, the apiary filter, the scale filter or the clipped filter added today is still
acted upon. `selectedIds` itself is never pruned when filters change.

For Move and Clone that is untidy. For **a veterinary medicines record it is not acceptable**:
writing a treatment against a hive the beekeeper cannot see, and did not knowingly select, is
the wrong failure in the one area of the app with a statutory paper trail.

**This plan fixes it** by deriving `selectedOwnedHives` from `filteredHives`, which requires
moving that derivation below the filter computation. It changes Move and Clone too — in the
direction their own comment already claims.

## 3. Design

### 3a. Two new buttons in the existing bulk bar

The floating action bar (`hives/page.tsx:594-623`) is already `flex-wrap`, and the page
already reserves `pb-40 md:pb-24` with a comment anticipating two rows. Two more buttons —
**Treatment** and **Feeding** — join Move, Clone and Clear. Five buttons plus the count will
likely reach three rows on a narrow phone, so the reserve is re-checked in the browser pass.

### 3b. One modal per record type

Both follow `MoveHivesModal` exactly: a `ModalShell`, local state for the form only, all data
by props, the parent owns open/closed and does every write.

**Bulk treatment** — the shared fields, which is every written column except `hive_id`:
date, time, product (with the same Other free-text path and jurisdiction filtering),
**Remove by** (prefilled from `removal_after_days`, exactly as the single form), dosage, batch
number, application method, temperature, weather conditions, notes.

**Bulk feeding** — date, feed type (with Other), quantity, unit, notes. That is *every*
written column except `hive_id`, so a bulk feeding is a pure fan-out with no per-hive work at
all.

### 3c. Weather is typed once, not fetched per hive

The single-hive form autofills temperature and conditions from the hive's apiary via Nominatim
and Open-Meteo, with **no caching anywhere in that path**. Fanning that out to seventeen hives
would fire up to seventeen geocoding and seventeen forecast requests for what is usually one
apiary, against a Nominatim policy that discourages bursts — and the helpers live on the
records page, so reusing them would mean refactoring that page.

Instead the bulk modal offers **temperature and conditions as ordinary optional fields, shared
across the batch**. A beekeeper treating seventeen hives in one session is standing in one
apiary in one set of conditions and knows the number. No API calls, no refactor, and both
columns are nullable — 12 of the 158 existing treatments already have no weather recorded.

Worth noting: **weather is not part of the DAFM report** (date, hive, apiary, eircode, product,
batch, dosage, method), so nothing statutory depends on it.

### 3d. Reminders — one per hive, and that is correct

Each bulk treatment creates one `tasks_events` reminder per hive, as the single path does.

The obvious worry is seventeen emails. **It is not a problem**, and this was checked rather
than assumed: `task-event-reminders/index.ts:330` loops *users*, gathers all of that user's due
reminders, and sends **one** grouped email per person — subject
`🐝 Task & Event Reminders - N Upcoming`. Seventeen reminder tasks produce one email listing
seventeen lines.

Per-hive rows are also the right shape for the apiary Visit Checklist, which groups
apiary → hive → tasks, and strips do come out hive by hive.

**One batch insert, not a loop.** `syncTreatmentReminder` does a lookup then a write, which is
2N round trips. Brand-new treatments have no reminder to find, so this plan adds a sibling
`createTreatmentReminders(inputs[])` that skips the lookup and inserts all N rows in one
statement, sharing the row-building with the existing function.

### 3e. Confirmation, and the honey-super check

A `useConfirm` dialog before writing, `variant: 'info'` as Clone uses, naming exactly what will
happen: *"Record Apivar for 17 hives? This creates 17 treatment records and 17 removal
reminders."*

The single form warns when the chosen hive has honey supers on. The bulk equivalent counts
them: *"3 of the 17 selected hives have honey supers on."* Shown in the modal, not blocking —
the same as today, where the warning informs but never prevents a save.

## 4. Why one insert, and what happens when it fails

All rows go in one `.insert(rows)`.

RLS on both tables is `user_id = auth.uid() AND can_access_hive(hive_id, auth.uid())`. A
multi-row insert is a single statement, so **if one row fails the check the whole batch is
rejected** with `42501`. That is the safe direction — a partial medicines record would be worse
than none — and it is why selection stays owner-only, as `hive-bulk-actions.md` already
requires: *"only offer selection for rows the user can actually write, so the UI stays honest."*

The reminder insert is **best-effort and separate**, following the inspection follow-up
precedent: if the treatments land but the reminders fail, the treatments stay and a single
warning toast says how many reminders are missing and where to add them.

## 5. Edge cases and risks

* **No duplicate protection.** Neither table has a unique constraint, so running a bulk apply
  twice writes every row twice. The confirmation dialog is the only guard, plus an in-flight
  disable on the confirm button — which the existing Move modal lacks and this will not copy.
* **`is_team_task` is overwritten by the database.** `set_task_team_flag()` recomputes it on
  insert, so no bulk logic may depend on the value sent.
* **Archived hives.** Both single forms already exclude them; selection is owner-only and the
  default archive filter hides them, but `can_access_hive` allows an owner to write to an
  archived hive, so the modal states the count it will write and the confirmation names it.
* **Dates.** `treatment_date` and `feed_date` are `date`. The bulk modals use
  `toLocalDateString`, **not** `toISOString().split('T')[0]` — the existing forms use the
  latter, which is a day out for users behind UTC. A pre-existing inconsistency not to copy.
* **Refetch surfaces.** After a bulk treatment the hives list must refetch, because
  `useHivesList` now derives the treatment pill and the "N Treatments On" summary.

## 6. Out of scope

* Bulk inspections, harvests or varroa checks. Gordon asked for treatment and feed.
* Bulk **editing** or removal of existing records — recording "strips out" across many hives is
  a natural follow-up, and is deliberately not attempted here.
* Weather autofill for bulk, and any refactor of the records page weather helpers (§3c).
* A select-all control. The hives page has none today; adding one alongside a bulk write is
  how a beekeeper treats three hundred hives by accident.
* **A latent bug found in passing, left alone:** `records/page.tsx:1141` writes
  `category: 'Treatment'` with a capital T on the varroa-check path, which violates the
  `tasks_events` category CHECK and will fail. Real, unrelated, and worth its own fix.

## 7. Implementation phases

1. **B1** — the selection-scope fix (§2), on its own so it can be reasoned about separately.
2. **B2** — `BulkFeedingModal` and its write. The simpler of the two, no reminders.
3. **B3** — `BulkTreatmentModal`, its write, and `createTreatmentReminders`.
4. **B4** — the two bulk-bar buttons, confirmation dialogs, refetch, toasts.
5. **B5** — verify: `npx tsc --noEmit`, `npx eslint`, the suite against the standing baseline,
   then the `qa-engineer` audit. Documentation updated. **Browser check is the owner's.**

## 8. Database connections

None. No schema change: both tables already hold every column needed, and
`tasks_events.treatment_id` was added by the treatment-removal work earlier today.

## 9. As built (03/09/2026)

**Verification.** 0 `src` type errors, ESLint clean, suite unchanged at the standing baseline
of 18 failed files / 137 failed / 661 passed.

| File | Change |
|---|---|
| `hives/page.tsx` | Selection-scope fix, lazy reference-data load, both handlers, two bulk-bar buttons, both modal renders. |
| `BulkTreatmentModal.tsx` | **New.** Shared treatment fields, removal-date prefill, honey-super count. |
| `BulkFeedingModal.tsx` | **New.** Five shared fields. |
| `treatment-reminder.ts` | `createTreatmentReminders` (one insert for N reminders) and the extracted `newReminderRow`. |

`newReminderRow` is shared by the single and bulk paths deliberately: a reminder created in
bulk must behave exactly like one created on its own, and two copies of that column list
would drift.

### QA audit

**🟠 High — the double-submit guard did not guard.** `handleBulkTreatment` and
`handleBulkFeeding` checked `bulkSaving`, but `bulkSaving` is only set *after* `await
confirmDialog(...)` resolves. Between entry and that resolution the flag is still false, so a
second invocation passed the guard and would write every record twice — and neither `feedings`
nor `varroa_treatments` has a unique constraint to catch it. Seventeen duplicate medicines
records is exactly the failure this feature exists to prevent. Fixed with `bulkInFlightRef`,
set synchronously on entry before any await, cleared in `finally`. `bulkSaving` now only drives
the button label.

**🟡 Medium — opening the second modal during the first fetch showed empty dropdowns.** The
loader set a "loaded" ref at the *start* of the fetch, so a second call returned immediately
while the data was still in flight. Now it stores the in-flight promise and awaits it, and
clears it on failure so a retry is still possible rather than caching a failure for the
session.

**🟡 Medium — one mistyped temperature could destroy a seventeen-hive write.**
`varroa_treatments.temperature` is `numeric(4,1)`, so `99999` overflows and PostgreSQL rejects
the **entire batch** — the all-or-nothing insert working against us. Bounded to -50…60 °C with
`min`/`max`, a validity check gating the confirm button, and a message beside the field.

**⚪ `isTeamTask` is sent as `false` and discarded.** `set_task_team_flag()` recomputes it
server-side on insert. Left explicit with a comment rather than removed, so nobody later
mistakes the sent value for the stored one.

**⚪ Inherited, not introduced:** `ModalShell` has no focus trap, Escape handler or focus
restore — only `MobileDrawer` uses `useDialogA11y`. Following the established modal pattern
inherits that gap. Fixing it belongs in `ModalShell`, where it would benefit every modal.

### Still to verify in a browser

1. Select several hives → **Treat** → pick Apivar → the removal date fills in, the honey-super
   count is right, and the confirmation names the number of records *and* reminders.
2. Records shows one treatment per hive; Tasks shows one reminder per hive.
3. The hives list shows the amber pill on every treated hive and the right "Treatments On"
   count.
4. **The selection-scope fix:** select several hives, then type in the search box so some are
   hidden, then bulk-record. Only the visible ones must be written to.
5. Five buttons plus the count in the bulk bar — check the `pb-40` reserve still clears it on a
   narrow phone, since it may now wrap to three rows.
