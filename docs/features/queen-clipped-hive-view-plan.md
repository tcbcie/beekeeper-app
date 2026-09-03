# Queen Clipped Status on the Hive View

**Date:** 03/09/2026
**Status:** Built 03/09/2026, corrected the same day (section 8). Not yet verified in a browser.
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

## 8. Correction — the wrong field was being read (03/09/2026)

Section 2 chose `hives.queen_clipped` because it covers all 308 hives while
`queens.queen_clipped` covers only the 108 with a queen record. That reasoning was
incomplete, and the owner found it immediately: a queen with **Queen Clipped ticked on her own
record** showed no chip and was missed by the filter.

### What section 2 missed

`HiveFormSection.tsx:652` gates the ✂ toggle:

```
{/* Show queen attribute toggles only when there is a queen to describe */}
{!formData.queen_id && !formData.is_queenless && (
```

**The hive's own clipped toggle is hidden whenever the hive has a linked queen.** So for those
108 hives there is no way to set `hives.queen_clipped` from the interface at all — the only
place clipping can be recorded is the queen form, which writes the other column.

Which column holds the truth therefore depends on the hive, because that is what decides which
form can edit it. The 31% conflict documented in section 2 is not data-hygiene drift; it is the
direct product of two edit paths, and reading either column alone misses whichever population
the other covers.

### The rule now

`src/lib/queen-clipped.ts` — `isQueenClipped(hive)`, used by both the card chip and the filter:

* queenless → `false` (nothing to clip, and the form hides the toggle in that state too)
* has a linked queen → `queens.queen_clipped`
* otherwise → `hives.queen_clipped`

`useHivesList` widens its queens `.select()` to fetch `queen_clipped`. No new query.

### Measured against the live data

| | |
|---|---|
| Chip showed before | 74 hives |
| Chip shows now | **68** |
| Newly shown | **14** |
| No longer shown | 20 |

The 14 newly shown include `59-DAN` (queen `53W`), the hive that exposed the bug, plus `#2`,
`#7`, `EPF 4B`, `H1`, `H3`, `H6`, `LNH 02A`, `LNH 05`, `LNH 12`, `LNH 15`, `R1`, `R3`, `SMF 03`.

### The 20 that stopped showing — deliberately left to the owner

Those have a queen assigned, `hives.queen_clipped = true` and `queens.queen_clipped = false`.
The queen record wins because **the hive flag can no longer be seen or edited** once a queen is
linked: showing "Clipped" from a field the beekeeper cannot reach, contradicting the one they
can, is worse than showing nothing.

It remains possible that those 20 are genuinely clipped and the hive flag is the honest record.
Copying the hive flag onto those 20 queens would preserve the display and reconcile the two
fields in one go, but it asserts clipping on 20 queens from a flag of unknown age, so it is the
owner's decision and no data was changed.

### Verification

0 `src` type errors, ESLint clean, suite unchanged at 18 failed files / 137 failed / 661 passed.

## 9. Clipped filter on the queen register (03/09/2026)

Section 8 established that for any hive with a linked queen, clipping can only be recorded on
the queen — the hive form hides its own toggle in that state. It follows that the register is
also where "which queens still need clipping?" has to be answerable, so the same filter now
sits there.

A `Clipped: All / Yes / No` select joins the ownership, status, assignment, role and apiary
filters on `/dashboard/queens`, persisted as `queens:clipped`. **No query change** —
`useQueensList` already selects `*`, so `queen_clipped` was in hand.

Against the live data, with the register's default status filter of *active*:

| Status | Total | Clipped | Unclipped |
|---|---|---|---|
| **active** | **153** | **22** | **131** |
| dead | 14 | 2 | 12 |
| cell | 12 | 0 | 12 |
| retired | 7 | 2 | 5 |

`Clipped: No` on active queens therefore produces a 131-queen spring worklist — something the
hive card cannot give, because the absence of a chip is not sortable. The twelve cells and
three virgins read as unclipped, which is correct: an unmated queen cannot be clipped. The
existing status filter already removes them.

**Not added: a visible clipped column in the register.** The filter answers the question by
itself — `Clipped: No` *is* the list — and a column would touch both the desktop table and the
mobile cards on a register that is already wide. Left for the owner to ask for.

Verification: 0 `src` type errors, ESLint clean, suite unchanged at 18 failed files / 137
failed / 661 passed.
