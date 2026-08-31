# Feature: Mobile-First — The Typography Floor

**Date:** 31/08/2026
**Status:** T1 to T6 complete — awaiting browser verification by the owner

**Result:** `text-xs` 971 → 393; arbitrary sizes below 14px 68 → 4; form controls
below 16px 13 → 0. The 393 remaining are the deferred long tail, held by a ratchet in
`tests/styles/typography-floor.test.ts`. Task record and per-stage findings:
`tasks/mobile-first-typography-todo.md`.
**Programme:** Mobile-first over-50 UX remediation. See
`mobile-first-over-50-ux-remediation-plan.md` section 12 for current state.

## 1. Overview

The last open P0 in the programme, and the only finding never assigned to a phase.
Phase 1 raised the floor in the shared button primitives and on its own five
surfaces; Phase 2 raised the navigation labels. Everything else was left.

Measured today: **971 `text-xs` across 138 files**, plus **68 arbitrary sizes across
13 files** (36 × `text-[10px]`, 32 × `text-[11px]`). Against 973/34/36 when the
review was written, three phases have moved the count by four.

This is deliberately **not** numbered as Phase 4 — that number belongs to the Hives
and Records simplification already scoped in the parent plan. This work is
orthogonal to it and can land before, after or alongside.

## 2. Scope & Simplicity

* **In Scope:**
  - The shared primitives that set the size for many screens at once.
  - Text in normal document flow, which can grow without any layout consequence.
  - The 68 arbitrary sub-12px sizes — the smallest and least legible text in the app.
  - The highest-traffic screens a beekeeper uses daily.
  - A guardrail so the count cannot climb back.
* **Out of Scope:**
  - The ~640 occurrences in settings, admin, research, tools, CRM, reports and
    traceability. Lower traffic; deferred by decision 2, and held back by the
    guardrail in T5 until re-measured.
  - Any change to colour, spacing, layout structure or component behaviour.
  - Rewriting the tables and dense grids that a size rise would strain. Where the
    text cannot grow without breaking a layout, this plan records it and leaves it.
  - The `@media print` rules, which set their own sizes in points.

### Simplicity rules applied

1. **Prefer one rule to many edits.** Six single points cover roughly 57 sites.
2. **Change the class, never the markup.** No element is restructured to make room.
3. **Order by risk, not by file.** Everything that cannot break layout goes first,
   so the benefit lands before the difficult cases are touched.
4. **Leave what genuinely cannot grow**, and say so, rather than forcing it.

## 3. The rule for meaningful versus decorative

The outstanding todo requires a rule rather than a find-and-replace. Phase 1
already established the principle when it exempted spinners from the reduced-motion
block: *does it communicate state, or is it decoration?* Applied to type:

**Text must reach the floor if a user could need to read it to act.** That covers
values, dates, identifiers, status badges, field labels, table headers, helper text,
timestamps and control labels — measured at 12px today, all of them meaning-bearing.

**Text may stay smaller only if removing it entirely would cost the user nothing.**
The survey found ~25 such cases in 971. The clear ones:

| Site | Why it stays |
|---|---|
| `HiveListCard.tsx:363` `═══` excluder glyph | Pure ornament; the excluder is stated in text elsewhere |
| `HiveListCard.tsx:402` `▒▒▒`/`███` mesh texture | Ornament inside a 12px box |
| `VersionDisplay.tsx:9` version string | Diagnostic, not operational |

Everything else is presumed meaningful. **A badge is meaningful** — the dashboard
alert-severity badges are the highest-stakes 12px text in the application, and
"badge" is a shape, not a licence to be unreadable. The parent plan names badges
only as a wrapping risk, never as an exempt category.

## 4. The floors

The parent plan sets **two** floors (line 96, and acceptance criteria at 293–294):

> "Make normal body and form text 16px; make navigation/help/metadata text at
> least 14px unless demonstrably non-essential."

**Section 12 and the outstanding todo both say only 14px.** The 16px tier was lost
when the state was summarised. A plan written from the backlog alone would
under-deliver against the programme's own acceptance criteria whilst appearing
complete. This was put to the owner and settled: **both tiers stand**, applied
narrowly:

* **16px (`text-base`)** — body copy, and form *values*: what the user types and
  reads back. This also removes the mobile Safari zoom-on-focus trap, which fires
  on any input under 16px. Nine `input`/`select` elements are below it today.
* **14px (`text-sm`)** — everything else meaning-bearing: labels, badges, headers,
  helper text, metadata, control labels.

## 5. Technical Design

### The single-point fixes, first

`src/components/ui/` is almost clean — only four occurrences, but each is rendered
across many screens:

| Site | What it sets |
|---|---|
| `ui/PageHeader.tsx:22` | The eyebrow on essentially every page |
| `ui/RadioChoiceGroup.tsx:69` | Option descriptions in every radio group |
| `ui/RatingButtons.tsx:49` | Button label — already `text-xs sm:text-sm`, so mobile only |
| `ui/RatingButtons.tsx:62` | Help text |

And two in `globals.css`, which reach further than any component:

| Site | Reach |
|---|---|
| `.fj-badge`, line 850, `font-size: 0.75rem` | `<Badge>`, 22 call sites |
| `.fj-chip-xs`, line 799, `font-size: 0.75rem` | `<Chip size="xs">`, of 31 `<Chip>` uses |

`.fj-chip-sm` is already `0.875rem`, so `xs` is the only chip offender. Note that
`tests/styles/contrast-tokens.test.ts` greps the raw CSS for literal declaration
strings inside named selectors; these two edits are in different selectors from the
ones it guards, but the suite must be re-run.

### Why the token override is rejected

Tailwind v4 reads font sizes from theme variables, and `@theme inline` currently
sets no `--text-xs`. Adding `--text-xs: 0.875rem` there would retarget all 971
occurrences in one line.

**It is rejected.** It fires indiscriminately into every constrained layout in
section 6 — the 12px-tall `h-3` excluder box, the 16-column leaderboard, the 160px
sticky compare column, the 64px date inputs in the graft grid. Each would need an
explicit `text-[0.75rem]` opt-out, so the "one line" becomes one line plus a
scattered set of opt-outs that are invisible at the point of definition and will
rot. It also makes `text-xs` and `text-sm` synonyms, which is a lie in the design
system and removes the vocabulary needed to describe the remaining work.

Recorded here because it is the obvious idea, and the reason against it is not
obvious.

### The repeated shape

Roughly 30 of the 68 arbitrary sizes are the same element in four sensor
components — `WolfSensorDisplay`, `WolfScalePanel`, `ScaleSensorDisplay`,
`HiveScaleCard` — every one a `text-[10px]` caption above a `text-sm font-bold
truncate` value. That is one decision applied thirty times, not thirty decisions.
Because the value beneath is already `truncate`d inside a `min-w-0` flex cell,
growing the caption pushes the value to truncate sooner; these are handled as a
group, with the tile layout checked once.

`QueenRearingPlanningTab.tsx:59` is similar leverage: a shared
`snapshotInsetBadgeBaseClass` constant, so one edit covers every use.

## 6. Edge Cases & Risks

The survey identified where 12px → 14px will not simply reflow. These are handled
last, individually, and some will be left as they are.

* **Fixed-height boxes smaller than the new line box.** `HiveListCard.tsx` renders
  the hive stack as ASCII art in `h-3` (12px), `h-6`, `h-8` and `h-10` boxes.
  A 20px line-height overflows `h-3` immediately. The `h-8` super row is worse than
  it looks: a `justify-between` flex holding a label, a "was NN%" span and
  `SuperFullnessGauge`, whose own numeral is `text-[11px]`, in 32px.
* **`CellFrame.tsx`** — `w-16` (64px) native `<select>` and `<input type="date">` at
  `text-[10px]` with `px-0`. A date input will not render at 14px in 64px. This one
  needs a layout answer, not a class change.
* **Wide tables.** The 16-column hive leaderboard (`batches/page.tsx:976`), the
  23-column `WildColoniesTab`, and `QueenCompareTable`'s `sticky left-0` first
  column pinned to `w-[160px]` with `whitespace-nowrap`. The parent plan's guidance
  applies: *"Prefer reflow and fewer simultaneous facts rather than shrinking text."*
  Reflow here means a mobile card view, which is Phase 4's business, not this plan's.
* **`leading-none` strips.** `ApiaryWeatherRow` uses `leading-none` in nine places
  to pack rows tightly, and renders once per apiary on the dashboard. Larger text
  with `leading-none` collapses the tuned rhythm; the leading must be revisited with
  the size, not after it.
* **Truncation regressions.** Thirteen lines pair `text-xs` with `truncate` or
  `line-clamp`. Bigger text in the same box shows fewer characters — a legibility
  gain and a comprehension loss on the same element. Each needs looking at.
* **Print desync.** `DAFMVarroaReport` is a statutory report whose screen size is
  `text-xs` but whose print size is forced to `9pt` by `.print-table`. Changing the
  screen size alone leaves the two describing different documents.
* **Uppercase plus tracking.** 88 sites combine `uppercase` with `tracking-*`.
  Wide letter-spacing at 12px is already near its column width; raising the size
  without relaxing the tracking will wrap headers that fit today.

## 7. Implementation Phases

Ordered so that everything incapable of breaking a layout ships before anything
that can.

1. **T1 — Shared primitives.** Four `ui/` components, two `globals.css` rules.
   ~57 sites, near-zero risk, visible on nearly every screen.
2. **T2 — Unconstrained flow text.** The ~97 helper paragraphs and ~72 field
   labels that sit in normal flow with no width or height constraint. They reflow
   taller and nothing else happens. The largest safe win in the plan.
3. **T3 — The 68 arbitrary sizes.** The smallest text in the app, handled as the
   four repeated shapes it actually is rather than 68 individual edits.
4. **T4 — High-traffic screens.** Hive card and detail (55), inspection card and
   form (38), dashboard and its apiary strip (49), batches and graft tracking (70).
   Layout-checked individually against section 6.
5. **T5 — Guardrail.** An ESLint rule rejecting new `text-xs` and arbitrary sub-14px
   sizes in JSX, so the count cannot climb back, plus a test asserting `globals.css`
   has balanced comment delimiters — see section 9.
6. **T6 — Documentation.** Update the parent plan's findings register and section 12.

**Deferred to a later stage, explicitly:** the ~640 occurrences in settings, admin,
research, tools, CRM, reports and traceability. Lower traffic, and the guardrail in
T5 stops them multiplying while they wait.

## 8. Decisions Taken

Settled by the owner on 31/08/2026.

1. **Two floors, not one.** 16px for body copy and form values; 14px for everything
   else meaning-bearing. The programme's original acceptance criteria stand, and the
   16px tier also closes the mobile Safari zoom-on-focus trap on the nine inputs and
   selects currently below it.
2. **T1 to T5, then re-measure.** The daily surfaces and the guardrail. The ~640
   occurrences in settings, admin, research, tools, CRM, reports and traceability are
   deferred; the lint rule in T5 stops them multiplying while they wait.
3. **The genuinely constrained sites are left, and recorded.** `CellFrame`'s 64px
   date inputs, the 16- and 23-column tables and `HiveListCard`'s 12px `h-3` box
   cannot take larger text without a layout change. Phase 4 should address the tables
   when it introduces mobile card views.

## 9. Note on a defect found whilst surveying

The survey of `globals.css` uncovered a live defect, since fixed: line 257 closed a
comment early, so six lines of prose and a second `*/` were parsed as part of a
selector and CSS error recovery **discarded the `:where(.above-bottom-nav)` rule
entirely**. Seven fixed-position surfaces use that class and none declares a mobile
`bottom` of its own, so on every phone the update prompt, install prompt, chat
button and dialog, toasts, the notification banner and the hives bulk-action bar
all fell back to `bottom: auto`.

This was Phase 2 work that has never functioned in production. It is why T5 includes
a comment-balance assertion: the failure is silent by construction, and a single
stray `*/` can delete an unbounded number of following rules with no error anywhere.

## 10. Database Connections (MCP Server)

None. This work changes presentation only. No schema, RLS policy, RPC or payload is
affected.
