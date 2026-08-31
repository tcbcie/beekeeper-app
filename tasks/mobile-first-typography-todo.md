# Task: Mobile-First — The Typography Floor

**Date:** 31/08/2026
**Status:** T1 to T6 complete — awaiting browser verification by the owner
**Plan:** `docs/features/mobile-first-typography-floor-plan.md`

## 1. Objective

Close the last open P0 in the mobile-first programme: text small enough to be hard
to read for an audience over 50 with reduced eyesight. **971 `text-xs`** across 138
files and **68 arbitrary sizes** (36 × `text-[10px]`, 32 × `text-[11px]`) across 13.

Two floors, settled with the owner:

* **16px** — body copy and form values.
* **14px** — labels, badges, table headers, helper text, metadata, control labels.

Decorative text — roughly 25 sites — stays as it is.

## 2. Impact Analysis

* **Files to Modify:** `src/app/globals.css`, four components in `src/components/ui/`,
  then the daily-use screens listed in T4. No markup restructuring, no behaviour
  change, no database or RLS change.
* **Simplicity Check:** six single points cover ~57 sites before any per-file work
  begins. Stages are ordered by layout risk, so everything that cannot break a
  layout ships before anything that can.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*

### T1 — Shared primitives (~57 sites, near-zero risk)

- [x] **Step 1:** `src/components/ui/PageHeader.tsx:22` — the eyebrow rendered on
  essentially every page.
- [x] **Step 2:** `src/components/ui/RadioChoiceGroup.tsx:69` — option descriptions,
  present in every radio group in every form.
- [x] **Step 3:** `src/components/ui/RatingButtons.tsx:49` and `:62` — the button
  label is `text-xs sm:text-sm`, so only mobile is below the floor; the help text is
  12px at every width.
- [x] **Step 4:** `globals.css` `.fj-badge` line 850, `0.75rem` → 14px. Reaches all
  22 `<Badge>` call sites.
- [x] **Step 5:** `globals.css` `.fj-chip-xs` line 799, `0.75rem` → 14px.
  `.fj-chip-sm` is already `0.875rem`, so `xs` is the only chip offender.
- [x] **Step 6:** Re-run `tests/styles/contrast-tokens.test.ts`. It greps the raw CSS
  for literal declaration strings inside named selectors; these edits are in
  different selectors, but the suite must confirm that.

**T1 outcome.** All six applied. `contrast-tokens.test.ts` 20/20, ESLint clean, no
`src/` type errors.

Noted whilst doing it: the `fj-badge`, `fj-chip`, `fj-icon-btn`, `fj-control` and
`fj-panel-*` families are **plain classes**, not wrapped in `:where()` like the
`fj-btn` family. They sit in `@layer utilities` after the Tailwind import, so at
equal specificity they beat any `text-*` utility passed through `className` — the
per-instance override silently does nothing. Exactly one call site is affected today
(`settings/page.tsx:117`, which asked for `text-sm` and was being held at 12px), and
raising `.fj-badge` resolves it. Recorded rather than fixed: migrating those families
to `:where()` is a sound follow-up but reaches well beyond this stage.

### T2 — Unconstrained flow text (~170 sites, reflows only)

Text in normal document flow with no width or height constraint. It grows taller and
nothing else happens. The largest safe win in the plan.

- [x] **Step 7:** The ~97 helper paragraphs, shaped
  `<p className="text-xs text-text-tertiary mt-*">`. `TBRPlanner.tsx` is almost
  entirely these; `apiaries/page.tsx:872` and `:991` explain why coordinates matter.
- [x] **Step 8:** The ~72 `<label className="block text-xs …">` field captions,
  several of which are currently smaller than the shared `FieldLabel` primitive.

**T2 outcome.** 271 changes across 78 files, applied by a rule rather than by hand:
every `<p>` and `<label>` whose class list contains `text-xs` **and** none of
`truncate`, `line-clamp`, `whitespace-nowrap`, `absolute`, `fixed`, `leading-none`
or `sticky`. Fourteen files were excluded wholesale as layout-constrained and belong
to T3, T4 or the record-and-leave list. Five further sites were skipped by the rule
because they truncate; they are folded into step 21.

**Count correction: the estimate of ~170 was low; the real figure is 271.** The
survey counted helper paragraphs matching one narrow shape
(`text-xs text-text-tertiary mt-*`); the category is larger than that shape. The
work is the same kind and the same risk — text in normal flow that can only reflow
taller — so it was completed rather than truncated at the estimate.

Verified: ESLint 0 errors across `src` (3 pre-existing `exhaustive-deps` warnings in
`tasks/page.tsx`), no `src` type errors, full suite unchanged at 18 failed files /
137 failed / 651 passed — the standing pre-existing baseline.

### T3 — The 68 arbitrary sizes (four repeated shapes, not 68 decisions)

The smallest text in the application.

- [x] **Step 9:** The ~30 sensor stat-tile captions in `WolfSensorDisplay.tsx` (11),
  `WolfScalePanel.tsx` (9), `ScaleSensorDisplay.tsx` (7) and `HiveScaleCard.tsx` (1).
  All are `text-[10px]` above a `text-sm font-bold truncate` value in a `min-w-0`
  flex cell, so growing the caption pushes the value to truncate sooner — check the
  tile layout once, apply thirty times.
- [x] **Step 10:** `QueenTrackerTab.tsx` — 17 sites, including four `<th>` at
  `text-[11px] uppercase tracking-[0.18em]`. Relax the tracking with the size; wide
  letter-spacing at 12px is already near the column width.
- [x] **Step 11:** `QueenRearingPlanningTab.tsx` — 8 sites, one of them the shared
  `snapshotInsetBadgeBaseClass` constant at line 59, so a single edit covers every
  use of it.
- [x] **Step 12:** `MatingNucsTab.tsx` — 5 sites, including the nuc tag code at
  `:1678`, an identifier read off a physical tag in the field.
- [x] **Step 13:** The singles — `QueenCompareTable` statistical qualifiers ("lower
  is better", "n = N"), `SuperFullnessGauge:48` donut numeral, `ApiaryWeatherRow:680`
  forecast toggle, `YardMap:592` "Entrance" marker. `VersionDisplay.tsx:9` is
  decorative and stays.
- [x] **Step 14:** `CellFrame.tsx` — record and leave. The `w-16` (64px) `<select>`
  and `<input type="date">` at `text-[10px]` will not render at 14px in 64px. This
  needs a layout answer, not a class change.

**T3 outcome.** 63 of the 68 arbitrary sizes raised to 14px. The five left are
deliberate:

| Site | Why it stays |
|---|---|
| `CellFrame.tsx:192, 205, 217` | Step 14 — `w-16` (64px) `<select>` and `<input type="date">`, plus a `truncate max-w-[3.5rem]` label. Needs a layout answer, not a class change. |
| `ApiaryWeatherRow.tsx:680` | Moved to T4 step 17. Its parent row is `text-xs`; raising the nested label alone would make "Hide" larger than the weather text beside it. It changes with the strip, or not at all. |
| `VersionDisplay.tsx` | Decorative. |

Findings from doing the work:

* **The ledger table needed no tracking change.** The plan assumed the wide
  `tracking-[0.18em]` would have to be relaxed. Measured: the table is
  `min-w-[48rem]` over four columns, ~160px of content each, and "Distribution" at
  14px with its tracking is ~131px. The tracking is design intent and stays.
* **The survey's claim that raising sensor captions pushes values to truncate was
  wrong.** Caption and value are stacked block-level `<p>`s, so caption width does
  not constrain value width. The real risk was the caption itself, which has no
  `truncate` — checked, and the longest ("Avg Brood Temp") wraps rather than clips.
* **`VersionDisplay`'s `text-[11px]` had never taken effect.** It sits on
  `.fj-badge`, which wins the cascade, so that badge rendered at 12px before T1 and
  renders at 14px now. The dead utility was removed and the reason recorded in the
  file. Second instance of the `:where()` gap noted under T1.
* **`SuperFullnessGauge` is rendered inside `HiveListCard`'s 32px `h-8` super row.**
  A 14px numeral gives a 20px line box, which fits, but the row also holds a label
  and a "was NN%" span. Verify that row when T4 reaches `HiveListCard`.

Verified: ESLint 0 errors, no `src` type errors, suite unchanged at 18 / 137 / 651.

### T4 — High-traffic screens (~330 sites, layout-checked individually)

- [x] **Step 15:** Hive card and detail — `HiveListCard.tsx` (26),
  `hives/[id]/page.tsx` (29). Includes the dates a beekeeper reads most (colony
  established, queen birth, installed, last seen, eggs last present), all currently
  `font-medium text-xs`. The ASCII hive-stack diagram is the risk: `h-3` is a 12px
  box and a 20px line box overflows it immediately.
- [x] **Step 16:** Inspection card and form — `InspectionCard.tsx` (14),
  `InspectionForm.tsx` (24). Phase 3 just restructured this form into five steps;
  re-check each step at 320px after the size rise.
- [x] **Step 17:** Dashboard — `dashboard/page.tsx` (20), `UpcomingEvents.tsx` (6),
  and `ApiaryWeatherRow.tsx` (23). The alert-severity badges at `:604`–`:644` are the
  highest-stakes 12px text in the app. `ApiaryWeatherRow` uses `leading-none` in nine
  places to pack rows tightly and renders once per apiary — revise the leading with
  the size, not after it.
- [x] **Step 18:** Apiaries and queens — `apiaries/page.tsx` (11),
  `ApiaryCard.tsx` (7), `apiaries/[id]/page.tsx` (14), `queens/page.tsx` (11),
  `queens/[id]/page.tsx` (14), `QueenFormSection.tsx` (10).
- [x] **Step 19:** Batches — `batches/page.tsx` (27),
  `QueenTrackingSection.tsx` (43, the worst file in the repo),
  `BatchFormSection.tsx` (25), `DistributionList.tsx` (21). Nine `input`/`select`
  elements here carry 12px input text and hit the 16px form-value floor.
- [x] **Step 20:** The wide tables — record and leave. The 16-column hive
  leaderboard (`batches/page.tsx:976`), the 23-column `WildColoniesTab`, and
  `QueenCompareTable`'s `sticky left-0` column pinned to `w-[160px]` with
  `whitespace-nowrap`. The parent plan's guidance is to prefer reflow, which here
  means a mobile card view — Phase 4's business.
- [x] **Step 21:** Check the 13 lines pairing `text-xs` with `truncate` or
  `line-clamp`. Bigger text in the same box means fewer visible characters: a
  legibility gain and a comprehension loss on the same element.

**T4 outcome.** 238 raised to 14px and 13 form controls raised to 16px across the
daily screens.

Two decisions the plan had wrong, corrected on evidence:

* **Step 20 said to leave the wide tables. They were raised instead.** The premise
  was that widening headers breaks the layout. It does not: both the batch table and
  the 16-column hive leaderboard sit in `overflow-x-auto` with `min-w-full`, so they
  already scroll and simply scroll a little more. The survey called 12px + uppercase
  + tertiary colour the worst legibility combination in the codebase, and a
  beekeeper who cannot read a header gains nothing from less scrolling.
  `WildColoniesTab` and `QueenCompareTable`'s sticky `w-[160px]` column were left.
* **`ApiaryWeatherRow`'s 7-day forecast could not simply grow.** Seven `flex-1`
  columns give ~41px each at 320px, and "18° 9°" side by side needs ~48px at 14px.
  Rather than shrink the text, the max/min pair now stacks — the parent plan's own
  guidance to prefer reflow. The `leading-none` elsewhere in the strip was kept: it
  scales with font size, so it packs tighter rather than collapsing.

Also:

* **`HiveListCard`'s stack diagram was safer than feared.** The `h-8` and `h-10`
  boxes take a 20px line box with room to spare. Only the two ornament rows stay
  small — the `h-3` queen-excluder rule and the `h-6` mesh-floor texture — which the
  decorative rule already exempted.
* **Step 21 found three clipped values, not thirteen.** `DistributionList` already
  had a `title`; the member email on the dashboard and the task description on hive
  detail did not, so both gained one. Larger text now costs no information.
* **The iOS zoom trap is closed on 13 controls**, ten of them in the graft tracker.
  The survey put the figure at nine; a wider search found more.

Verified: ESLint 0 errors, no `src` type errors, suite unchanged at 18 / 137 / 651.

### T5 — Guardrail

- [x] **Step 22:** An ESLint rule rejecting new `text-xs` and arbitrary sub-14px
  sizes in JSX, so the count cannot climb back while the ~640 deferred occurrences
  wait. Allow an explicit opt-out comment for the recorded decorative sites.
- [x] **Step 23:** A test asserting `globals.css` has balanced comment delimiters.
  A stray `*/` silently deletes every rule until the next valid one, with no error
  anywhere — this is how `.above-bottom-nav` was lost. See the note below.
- [x] **Step 24:** Re-measure and record the counts.

**T5 outcome.** One new file, `tests/styles/typography-floor.test.ts`, 10 tests.
Suite now 18 failed files / 137 failed / **661** passed — the 10 additions, with the
pre-existing failures untouched.

**Step 22 was implemented as a test ratchet, not an ESLint rule.** The rule was
written and rejected on measurement: 393 `text-xs` remain in the deferred long tail,
so an error-level rule fails `npx eslint src` outright, and a warning-level one adds
449 warnings that would bury the three real ones already there. Suppressing it
per-file would need an ignore list of ninety-odd paths that rots on every edit.

The ratchet does the same job with none of that: a recorded ceiling of 393 `text-xs`
and 4 arbitrary sub-14px sizes, which may fall but never rise. New 12px text fails
the suite. Alongside it, exact assertions that the three `ui/` primitives contain no
sub-14px class and that `.fj-badge`, `.fj-chip-xs` and `.fj-chip-sm` each declare at
least `0.875rem`. Its one weakness, accepted: a count cannot tell a swap from a
regression, so removing one site and adding another elsewhere passes.

**Each guard was proved to fail before being kept.** The three defects were
reintroduced one at a time and the suite re-run: the stray `*/` was caught at the
right line, the 12px primitive was caught, the ratchet was caught. The first attempt
at injecting the comment defect silently did not match, so the test appeared to pass
when it had not been exercised at all — worth recording, because that is precisely
how a guard ends up decorative.

**T4 had a gap, found while taking the final counts, and closed.** Its file list
named `InspectionCard` and `InspectionForm` but not their siblings, so the varroa,
harvest, feeding, treatment and archive cards would have rendered 12px beside a 14px
inspection card **on the same Records screen**. Worse, T3 had raised the sensor tile
captions to 14px while leaving their own section headings ("Weight", "Colony",
"Environmental", "Technical") at 12px — an inverted hierarchy this stage introduced.

52 further sites swept across 16 files: the four other record forms and five record
cards, `HiveFormSection`, the three sensor components' section headings,
`QueenRoleBadge`, `QueenAssignmentHistory`, `QueenReportTab`, and `QueenCompareTable`
apart from its two sticky `w-[160px]` column headers. Final count 445 → **393**.

The lesson for the remaining long tail: a file list drawn from a survey groups by
*count*, not by *what appears together on one screen*. Consistency within a screen
matters more than completeness within a file.

### T6 — Documentation

- [x] **Step 25:** Update the parent plan's findings register (P0 "Pervasive small
  text") and section 12 with what shipped and what remains.
- [x] **Step 26:** Update `tasks/mobile-first-outstanding-todo.md` section B.

## 4. Already Done

- [x] **`globals.css:257` — a live defect fixed before planning began.** The comment
  closed early, so six lines of prose and a second `*/` were parsed as part of a
  selector and CSS error recovery discarded the whole
  `:where(.above-bottom-nav)` rule. Seven fixed-position surfaces use that class and
  none declares a mobile `bottom` of its own, so on every phone the update prompt,
  install prompt, chat button, chat dialog, toasts, the notification banner and the
  hives bulk-action bar fell back to `bottom: auto`. Phase 2 work that had never
  functioned in production. `contrast-tokens.test.ts` passes 20/20 after the fix.

## 4b. QA Audit (31/08/2026)

A Principal Quality Architect pass over the stage diff. No Critical issues. One High,
two Medium, two Low.

**🟠 High — the stage flattened the label/value hierarchy it was meant to serve.**
T3 raised the sensor tile captions to 14px but left the readings beside them at 14px,
so caption and reading became the same size across **27 tiles** in
`WolfSensorDisplay`, `WolfScalePanel` and `ScaleSensorDisplay`. The reading is the
point of the tile, and for a low-vision audience a hierarchy resting on font weight
alone is exactly the wrong outcome. All 27 readings moved to 16px, restoring 14/16.
This is the same class of mistake as the inverted section headings found at the end
of T4, from the same cause: raising one half of a pair without looking at the other.

**🟡 Medium — `ApiaryWeatherRow` stat blocks became internally inconsistent.**
`WeightChip` (`:162`) had label 12px / value 14px and became 14/14. The queen-status
slot was worse: its alert branch (`:837`) rendered 14px while its "Healthy" branch
(`:847`) rendered 16px, so the same slot changed size with state — and after T4 the
alert branch also matched its own label. Both values moved to 16px, matching the
Hives and Last Inspected blocks, which were already label 14 / value 16.

**🟡 Medium — `TBRPlanner`'s `Milestone` (`:996`)** had label 12px / date 14px and
became 14/14. The date moved to 16px.

**⚪ Low — redundant `text-sm sm:text-sm`** left on two rating pickers in
`InspectionForm` (`:1574`, `:1637`) by the blanket pass. Removed.

**⚪ Low — the ratchet only counts `text-xs` and `text-[Npx]`.** A rem-based
arbitrary size such as `text-[0.75rem]` would slip past it. Not changed, because the
audit brief excludes authoring tests; recorded for whoever extends the guard.

Checked and found clean: no replacement landed outside a class string (the single
non-`className` hit is the intended `snapshotInsetBadgeBaseClass` constant); no
conflicting or duplicated size utilities; no `print:` size touched; no `text-xs` left
inside an `aria-label`, `title` or `placeholder`. The three inline `Label: value`
pairs in `ApiaryWeatherRow` and one in `VarroaCheckCard` are correctly the same size —
they read as running text, not as stacked stat blocks. Two flattened pairs in
`HiveQRCode` and `NucQRCode` are pre-existing and were not touched by this stage.

Verified after fixes: ESLint 0 errors, no `src` type errors, suite 18 / 137 / 661.

## 5. Post-Task Review

* **Root Cause Found:** the typography floor outlived three phases because it was
  never assigned to one. Phase 1 fixed the primitives, Phase 2 the navigation
  labels, and the ~1,000 sites on every other screen were nobody's job. Nothing was
  stopping the count growing, either, which is why it had reached 971.

* **Summary of Changes:** 578 `text-xs` sites raised to 14px, 64 arbitrary sub-14px
  sizes raised, and 13 form controls raised to 16px, across roughly 100 files. Six
  shared single points (four `ui/` components, `.fj-badge`, `.fj-chip-xs`) carry
  about 57 of those on their own. One layout reflow — the 7-day forecast temperatures
  now stack — and two `title` attributes so that larger text in a clipped box costs
  no information. One live defect fixed: a stray comment delimiter in `globals.css`
  that had been silently deleting the `.above-bottom-nav` rule since Phase 2. Ten new
  guard tests.

* **Notes for User:**
  - **Nothing here has been seen in a browser.** The counts, widths and line boxes
    were computed, not observed. Checks 7 to 10 in the parent plan's section 12 are
    new and specific to this stage.
  - **`.above-bottom-nav` is the one to look at first.** Seven floating surfaces have
    been mispositioned on mobile for the whole of Phase 2, and this is the first
    build in which the rule that places them actually applies. They will move.
  - The suite stands at 18 failed files / 137 failed / 661 passed. The failures are
    the pre-existing baseline and are untouched; the passing count rose by the ten
    guards added here.
  - `npx eslint src` reports 0 errors and 3 warnings, all pre-existing
    `exhaustive-deps` in `tasks/page.tsx`.

## 6. Deferred by decision

The ~640 occurrences in settings, admin, research, tools, CRM, reports and
traceability. Lower traffic. To be re-measured after T5, with the lint rule holding
the line in the meantime.
