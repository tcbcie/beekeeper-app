# Queen Clipped Status on the Hive View

**Date:** 03/09/2026
**Status:** Built 03/09/2026. Not yet verified in a browser — that is the owner's check.
**Origin:** Support ticket, Gordon McCabe, 26/07/2026 (`suggestion`, open):

> "A simple one, but useful in the spring for me. As I don't like clipping queens going
> into winter. JIC."

## 1. It is as simple as he says — no schema change

`hives.queen_clipped` already exists (boolean, default false). It is already written by the
hive Edit form (`HiveFormSection.tsx:688`, a ✂ toggle), already tracked as a change in
`HiveConfigurationHistory.tsx:299`, already shown on the hive **detail** page
(`hives/[id]/page.tsx:752`), and — because `useHivesList` selects `hives.*` — **already
present in the hives list payload**.

The only thing missing is that `HiveListCard` never renders it. So this is a display change
in one file, with no migration, no new query and no extra round trip.

## 2. The finding that decides which field to show

There are **two** competing clipped flags, edited independently:

| Field | Written by | True |
|---|---|---|
| `hives.queen_clipped` | Hive Edit form | **74 of 308** |
| `queens.queen_clipped` | Queen form (`QueenFormSection.tsx:609`) | 25 of 196 |

They disagree badly. Of the **108 active hives that have a linked queen record**:

* **75 agree** — but 72 of those are simply "both false"
* **20** say clipped on the hive, not clipped on the queen
* **13** say the reverse
* only **3** say clipped in both places

That is **33 of 108 (31%) in conflict**.

And the decisive number: **185 active hives have no linked queen record at all, of which 51
are flagged clipped on the hive.** Those 51 are invisible to `queens.queen_clipped`.

**Therefore the hive view must show `hives.queen_clipped`.** It covers all 308 hives rather
than the 108 with a formal queen record, it is the field the hive Edit form actually writes,
and it needs no query change. Showing the queen-record field instead would silently omit 51
hives the beekeeper has already marked.

**Reconciling the two fields is out of scope** and is flagged in section 5 — it is a data
decision, not a display one, and picking a winner would overwrite real user input.

## 3. What gets built

A **✂ Clipped** chip in the queen row of `HiveListCard`, placed after the existing queen
branches so it shows regardless of whether the hive has a linked queen record, a marked-only
queen, or no details at all. The ✂ glyph matches the toggle in the hive Edit form, so the
indicator and the control that sets it read as the same thing.

Shown **only when true**. 234 of 308 hives are not clipped, and a "Not clipped" chip on all of
them would be permanent chrome on every card — the density problem Phase 4 recorded.

## 4. The spring question

Gordon's actual task is *"which queens still need clipping?"*, which is the **absence** of the
chip. Reading absence works, but only if you already know the convention.

A **clipped filter** on the hives list answers it directly and costs no card space. The list
already has a `FilterDisclosure` holding the scale filter, with `activeFilterCount` and
`clearCollapsedFilters` to join. This is proposed as an option rather than assumed — see the
question put to the owner.

## 5. Out of scope

* Reconciling `hives.queen_clipped` with `queens.queen_clipped`, or picking one as canonical.
  Section 2 documents the conflict; resolving it would overwrite data.
* The apiary map token, which already encodes queenless-red and active-green.
* Backfilling or inferring clipped status from anything.

## 6. Database connections

None. `hives.queen_clipped` already exists and is already fetched.

## 7. As built (03/09/2026)

**Verification.** 0 `src` type errors, ESLint clean, suite unchanged at the standing baseline
of 18 failed files / 137 failed / 661 passed. Two files, 38 lines.

| File | Change |
|---|---|
| `HiveListCard.tsx` | The ✂ Clipped chip, and `flex-wrap` on the queen row so it cannot overflow. |
| `hives/page.tsx` | `clippedFilter` state, predicate, filter count, clear action, and the select. |

`hive.queen_clipped` is a required boolean on the `Hive` type and arrives via the existing
`select('*')`, so no query, hook or type changed.

### QA audit — no Critical or High findings

The change adds no data flow, no async work and no new query, so most of the usual failure
surface does not exist here. Three notes, all accepted rather than fixed:

**⚪ The chip renders on archived hives.** The queen row itself already renders for archived
hives, so suppressing only the chip would be the inconsistent choice. Archived hives are
excluded by the default archive filter in any case.

**⚪ "Clipped: No" includes hives with no queen.** 185 active hives have no linked queen
record and some are queenless, so the unclipped list is not strictly a "queens to clip"
worklist. Excluding them was rejected: the label says clipped-no, and a queenless hive
genuinely is not clipped. Hiding rows the label does not exclude would be worse than a list
that needs a moment's reading.

**⚪ The filter persists across sessions.** Set "Clipped: No" in spring and it is still set in
autumn. Mitigated by design rather than by accident: `clippedFilter` is wired into
`activeFilterCount`, so `FilterDisclosure` shows a badge reading "1 filter active" and offers
Clear.

**Deliberately not gated on data, unlike the scale filter.** The scale control only appears
when some hive has a scale, because most beekeepers never own one. Clipping is an ordinary
seasonal attribute, so gating it would make the control appear and vanish across the year —
a moving target for an audience that relies on things staying put.

### Still to verify in a browser

1. A hive with a clipped queen shows **✂ Clipped** in the queen row.
2. The 51 hives flagged clipped **with no queen record** show it too — that is the case the
   queen-record field would have missed.
3. Filters → **Clipped: No** narrows the list, and the filter badge shows one active filter.
4. Clear resets it.
