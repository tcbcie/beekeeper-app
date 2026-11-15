# One-render flashes from state set in effects (L2) — plan

**Status:** approved and built 15/11/2026. All 19 places done; lint 0 errors, `set-state-in-effect` warnings 177 → 158. The weather badges are computed directly while drawing rather than in a `useMemo`: a memo there tripped the now-strict memo rule, and the sums are too small to need one · **Date:** 15 November 2026 · **From:** `deferred-items-review-plan.md` L2

## What this is

The lint rule `react-hooks/set-state-in-effect` reports 177 places. In most, a loading flag is set at the start of a load, which is harmless.

In about 36, an effect copies or resets a value **after** the screen has drawn. React then draws once more with the right value. For that first draw the screen shows the old value: the previous hive's data in an edit form, zeros in a table, a panel expanded then collapsing.

All 36 were read on 15/11/2026, and each has a fix of a few lines (two reviews, every effect and its state traced).

## Can the beekeeper see it?

**Honest caveat:** after a tap or a keypress, React runs these effects before the screen is painted. So many of these "flashes" are never actually seen. They are visible when the value changes because **data arrived** (after a load), and some are visible on reopening a dialog.

This batch therefore takes only the places where the flash can be seen, or where the fix also removes a wasted render on a busy screen. The rest are invisible tidying and are left as warnings.

## In this batch (19 places, 17 files)

| # | Where | What the beekeeper could see | Fix |
|---|---|---|---|
| 1 | Records list (`records/page.tsx`) | After changing a filter, the list draws up to the old "show more" count before snapping back to 50 rows (wasted render of up to 150 rows on a phone). | The count resets as part of the filter change (state remembers which filters it belongs to) |
| 2 | Hive edit form (`HiveFormSection`) | Choosing Edit on another hive while one is open: the first draw shows the previous hive's values and photo. | `key` per hive in the parent, so the form starts fresh; the image hook takes an initial photo instead of an effect |
| 3 | Queen edit form (`QueenFormSection`) | Same for queens. | `key` per queen in the parent |
| 4 | Queen marking colour (`QueenFormSection`) | After changing the birth date, the colour select shows the old colour for a draw. | Colour worked out from the birth date during render (same rule: auto colour wins, as today) |
| 5 | Mel chat (`ChatDialog`) | First open shows an empty chat, then the welcome message. | Start with the welcome message |
| 6 | Photo viewer (`ImageZoomModal`) | Reopening can show the previous photo still zoomed or moved. | Reset when it opens, during render; the page-scroll lock stays an effect |
| 7 | Dashboard weather card (`ApiaryWeatherRow`) | Nectar, pollen and flying-hours badges pop in after the weather arrives. | Worked out from the weather with `useMemo` |
| 8 | Varroa treatment form (`VarroaTreatmentForm`) | The "honey supers on" warning appears a draw late after picking a hive. | Worked out from the selected hive |
| 9 | Batch cell frame (`useBatchGrafts`) | Panel draws expanded, then collapses, after the grafts load (layout jump). | Default applied in the same render the grafts arrive |
| 10–11 | NIHBS monthly return | After the report loads, the editable figures show 0 for a draw; the group picker can fetch for a group that no longer exists. | Figures seeded when the report arrives; group default chosen before any fetch |
| 12 | Profit and loss record form | Switching income/expense leaves a category from the other list for a draw. | Cleared in the radio's own handler |
| 13 | Inspection form errors (`InspectionForm`) | A fixed field's "required" message lingers a draw. | Errors re-checked when the step or hive changes, during render |
| 14 | Print labels dialog | Reopening shows the previous "pop-up blocked" banner for a draw. | Reset when it opens, during render |
| 15–16 | Inspection and varroa cards | A photo that failed once could stay marked failed for a draw after it is replaced. | Remember *which* photo failed |
| 17–18 | Batch form, mating nuc form | Hive and cell drop-downs filter a draw late. | Lists worked out with `useMemo` |
| 19 | Terminology settings | Search shows an out-of-range page for a draw. | Page reset in the search box's handler |

**How the fixes work:** wherever possible the value is simply **worked out during render**, so the extra state and effect go. Where the beekeeper can also change the value, it is reset during render with the React pattern "store the previous input, compare, set". Where a whole form should start fresh, the parent gives it a `key`. All of these are the React documentation's recommended replacements.

## Left as they are (about 17)

Invisible tidying (clearing selections of rows that no longer exist, default year chips, unlock lists, small page resets), and four that must stay effects:

- the mating nuc distribution reset
- the list position restore, which needs the drawn list
- the hive list filter check, which writes to shared storage
- the user management pager

They stay warnings. The rule stays a warning because of the 140 loading-flag cases.

## Risks

- Each fix is small, but they sit on field screens: records, inspection form, hive and queen forms, dashboard weather card. Each one keeps the same behaviour; the QA audit checks every change.
- **Hive and queen edit forms (key):** switching from one hive's edit form straight to another's starts the form fresh. That is what happens today too (the effect overwrote typed text). The hive models list re-reads from its saved copy, so nothing flickers.
- **Tests:** the inspection form, records and forms have tests; you run them.

## Your check after deployment

- Records: filter, "show more", change filter.
- Edit a hive, then Edit another without closing.
- A queen: change the birth date and watch the colour.
- Open Mel.
- Open a photo, zoom, close, open another.
- Dashboard weather card.
- A varroa treatment on a hive with supers.
- A batch page with grafts.
