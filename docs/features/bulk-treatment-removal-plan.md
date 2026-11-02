# Bulk Treatment Removal and Select All

**Date:** 02/11/2026
**Status:** Built 02/11/2026. Not yet checked on a real phone, which is the owner's check.
**Origin:** Support ticket, Gordon McCabe, 08/09/2026 (`suggestion`, open):

> "When I want to tick all my treatments for removal, a multi select option would be useful
> again a 'select all' would be beneficial :)"

## 1. Today

Recording a removal means opening each treatment in Records, ticking "Treatment removed" and
saving. The Hives screen can already select several hives for Move, Treatment, Feeding and Clone,
but it has no Select all and no way to record a removal. It is the right home: it already shows
which hives have a treatment on.

## 2. What the beekeeper gets

**In selection mode on Hives**, a row above the list:

* **Select all (N)** picks every hive the beekeeper owns in the current list, so the apiary filter
  and search narrow it. It becomes **Clear selection** once everything is picked.
* **Treatment on (N)** picks only the owned hives with a treatment on. Shown only when N is above 0.

**In the bulk action bar**, a **Remove treatment** button, shown when a selected hive has a
treatment on. It opens a short sheet with:

* a summary, for example "Apivar on 5 hives, Thymovar on 2", and how many selected hives have
  nothing to remove;
* **Removed on**, defaulting to today, and not allowed in the future;
* **Record removal for N**. The sheet is the confirmation, so no second dialog follows.

Afterwards the amber or red treatment labels go, the summary count falls, and the reminders close,
so nobody is emailed to remove strips that are already out.

## 3. How it works

No schema change. All writes go through the existing columns and RLS.

1. Update `varroa_treatments`, setting `removed_date`, in chunks of 100 hive ids where:
   `hive_id` is selected, `user_id` is the beekeeper, `planned_removal_date` is set,
   `removed_date` is null, and `treatment_date` is on or before the chosen date. `.select('id, hive_id')`
   reports exactly what changed.
2. Close the reminders: `tasks_events` where `treatment_id` is one of those ids gets
   `completed = true` and `completed_at`. A new `completeTreatmentReminders` in
   `src/lib/treatment-reminder.ts`. Best effort, with a warning toast, like the existing path.
3. Refresh the list and leave selection mode.

## 4. Edge cases

| Case | Behaviour |
|---|---|
| A hive holds two treatments on | Both are marked removed. The list shows only the newest, so the summary counts treatments from the query, not from the labels |
| The chosen date is before a treatment was applied | That treatment is left on, because a database check forbids it. The result message says how many were left |
| A team-mate recorded the treatment on the owner's hive | RLS allows only the recorder to update it, so it is left on and counted in the same message. No such rows exist today |
| A team-mate's hive | Cannot be selected, as now |
| Double tap | `bulkInFlightRef`, as the other bulk actions |
| Signal drops part way | Chunks that arrived stay saved and an error shows. Running it again only touches what is left, so it cannot double-write |
| A long Select all | Chunks keep the URL within its limit. Move is not chunked today, and Select all makes a long list more likely, so `handleBulkMove` gets the same chunking |
| Wrong selection | Reversible one at a time by unticking on the treatment in Records. No bulk undo |

## 5. Files

| File | Change |
|---|---|
| `src/app/dashboard/hives/page.tsx` | Selection row, Remove treatment button, handler, chunked Move |
| `src/components/hive/BulkTreatmentRemovalModal.tsx` | New, follows `MoveHivesModal` |
| `src/lib/treatment-reminder.ts` | `completeTreatmentReminders` |
| `docs/features/hive-bulk-actions.md` | Updated |

## 6. Out of scope

* Offline removal: it needs a signal, like the other bulk actions.
* Select all on Records or other screens.
* Widening RLS so team-mates can record removals, which is a permissions decision.
* Closing the support ticket, which is left to the owner.

## 7. Worth knowing

Only **one** treatment in the whole database currently reads as on (checked 02/11/2026). Treatments
count as on only when they have a "Remove by" date, so the action will be quiet until beekeepers
next treat. Older treatments without that date cannot be bulk-removed, as they do not read as on.

## 8. Verification

`npx tsc --noEmit`, `npx eslint` on changed files, related tests, then the `qa-engineer` audit. The
build and the real-phone check are the owner's.
