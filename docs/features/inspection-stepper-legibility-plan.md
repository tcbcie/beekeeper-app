# Feature: Making the Inspection Stepper Legible and Skippable

**Date:** 03/09/2026
**Status:** S1 to S4 complete - awaiting browser verification by the owner
**Programme:** Mobile-first over-50 UX remediation. Follows Phase 4.

## 1. The complaint, and what the code says

The observation is that consolidating the long inspection form into five steps
was right - the original required constant scrolling - but that two things were
lost with it:

1. **You cannot see what is behind each step.**
2. **You can no longer skip a section you do not need.**

Both are true, and reading the component shows they are cheaper to fix than they
look, because the flow already contains almost everything required.

### 1a. The titles exist and are not shown

`INSPECTION_STEPS` in `src/components/records/forms/InspectionStepper.tsx`
carries a `title` for every step, and an `optional` flag on steps 3 and 4 whose
own comment reads *"Shown to the user, so a common inspection can be finished
without these."*

It is not shown. The stepper button renders `step.id` and nothing else - a bare
digit in a 200px-wide box on desktop. The title and the "(optional)" marker
appear only in the heading, and only for the step already open. So the
optionality of steps 3 and 4 is invisible until the beekeeper has walked into
them, which is exactly when it stops being useful.

### 1b. The forward gate protects nothing

`reachable = step.id <= furthest` disables every step ahead of the furthest one
reached, so the only way forward is Next, one step at a time.

`validateStep` opens with `if (target !== 1) return []`. **Steps 2, 3 and 4 have
no required fields whatsoever.** The entire required set is hive, date and time,
all on step 1. So after step 1 the gate withholds nothing; it just makes a
beekeeper who wants queen-seen and a note press Next past two screens of
disease ratings and hygienic-trait sliders.

And the backstop is already built: `outstandingErrors` gathers errors across
every step, the review step disables Save while any remain, and it renders a
"Go to step 1" button that jumps to the first offender. Free forward movement
cannot produce a bad save, because the review step will not let it.

## 2. Scope

* **In scope:** the stepper's labelling, its reachability rule, and a one-line
  statement of what each step contains.
* **Out of scope:** moving any field between steps, changing what is required,
  changing the review step, and any change to `InspectionForm`'s state. The
  fields are grouped sensibly; the grouping is not what is being complained
  about.

## 3. Design

### S1 - Label every step, not just the active one

Add a `shortTitle` to each entry, because five full titles will not fit across a
360px phone and the typography floor forbids shrinking the text to make them:

| # | Title | Short |
|---|---|---|
| 1 | Hive and visit | Hive |
| 2 | Queen and colony | Queen |
| 3 | Health and behaviour | Health |
| 4 | Notes and follow-up | Notes |
| 5 | Review and save | Review |

The button becomes number-above-label. At 14px the five short labels need about
310px of the roughly 328px available inside the panel at 360px, so it fits, but
**this is the one thing that must be checked in a browser at 320px** rather than
trusted. If it does not fit, the fallback is the label on `sm:` and above with
the number alone below that - still an improvement, since the phone user gets
the contents line from S3 either way.

Full titles stay in `aria-label`, so nothing changes for a screen reader.

### S2 - Allow forward jumps once step 1 is valid

```
reachable = step.id <= furthest || firstStepValid
```

`firstStepValid` is `validateStep(1).length === 0`, which the component already
computes. Before a hive is chosen the flow behaves exactly as it does now; after
it, every step is one tap away in either direction.

This is the change that answers "you can no longer skip a section". It removes
a restriction rather than adding machinery.

### S3 - Say what each step holds

A `contents` string per step, rendered under the heading:

* 1 - Hive, apiary, date, time and weight.
* 2 - Queen sighting, eggs, brood frames, colony strength, queen cells and super fullness.
* 3 - Temperament, brood pattern, swarming, drones, propolis, disease indicators and hygienic traits.
* 4 - Frames given or taken, notes, a photograph and follow-up tasks.
* 5 - Everything recorded, before saving.

This is the direct answer to "deprived of what should be captured and what is
actually available". It is static text taken from the review-summary groups
already in the file, so the two cannot describe different fields.

### S4 - Mark optional steps in the stepper itself

Steps 3 and 4 already carry the flag. Show it on the button as a small
"optional" line, so it is visible from step 1 rather than on arrival.

## 4. Risks

* **Width at 320px** is the only real one. See S1 for the fallback.
* **A jump straight from step 1 to step 5** now lands a beekeeper on the review
  screen with two groups populated. That is correct behaviour and the summary
  omits empty values by design, but it is worth watching in the sessions.
* **`furthestStep` keeps its meaning** - it still marks what has been visited,
  which drives the tick marks. Only reachability changes.

## 5. Steps

1. [x] **S1** - short titles and the two-line button.
2. [x] **S2** - the reachability rule.
3. [x] **S3** - the contents line.
4. [x] **S4** - the optional marker, delivered as a sentence. See section 7.
5. [x] **S5** - type-check, lint, suite.
6. [ ] **S6** - browser verification by the owner.

## 6. Verification

No `src` type errors. ESLint clean on both changed files. Suite unchanged at the
standing baseline of 18 failed files / 137 failed / 661 passed, including all 23
stepped-flow tests, the 9 inspection dirty-state tests and the 10 typography
floor tests. The stepper buttons keep their `aria-label`, which overrides their
visible content, so no accessible name changed and no existing query broke.

**Not yet seen in a browser.** What matters:

- The five labels on a 320px phone. The measurement below says they fit with
  about 3px to spare, which is close enough to want confirming.
- Tapping step 5 directly from step 1, and confirming steps 2, 3 and 4 show
  numbers rather than ticks afterwards.
- That an unvisited step now reads as tappable rather than greyed out.

## 7. Two departures from the plan as approved

### 7a. The optional marker is a sentence, not a per-button word

The plan put "optional" on each of the two buttons. Measuring the container
first killed that: the page uses `max-w-4xl mx-auto px-4` and the form sits in a
panel with `p-4`, so a 320px phone leaves **256px** for five columns, about 45px
each. "optional" needs roughly 52px at the 14px floor and would have clipped
mid-word - and the floor forbids setting it smaller.

So the stepper carries one derived line instead: *"Steps 3 and 4 are optional,
and can be skipped."* It is built from the steps' own `optional` flags, so it
cannot drift from them; it is legible at every width; and it states the
skippability outright, which suits the audience better than a repeated adjective
would have. The full title and "(optional)" remain in each button's accessible
name.

The short titles themselves do fit: "Review" is the widest at roughly 43px
against the 45px available, once the horizontal padding and gap are halved below
`sm`.

### 7b. S2 needed a state change the plan did not foresee

The plan said `furthestStep` "keeps its meaning - only reachability changes".
That was wrong. `isComplete` was `step.id < furthest`, and `goToStep` raises
`furthest` to wherever it lands, so jumping from step 1 to review would have
raised it to 5 and **ticked steps 2, 3 and 4 as complete without the beekeeper
having opened any of them** - the stepper would have reported work that was
never done.

`furthestStep` is therefore replaced by `visitedSteps`, a `Set` of the steps
actually opened. Ticks mean visited; reachability is membership or
`canJumpAhead`. Under pure Next/Previous use the two are identical, so nothing
about the existing flow changes.

A related point surfaced in review: muting was keyed to `isComplete`, and
because unreachable and unvisited used to coincide, a step ahead would have been
tappable while dressed in the disabled `text-text-muted`. Muting is now keyed to
`reachable` instead.

## 8. QA audit (03/09/2026)

No Critical. No High. Two Medium, two Low - all fixed.

**Medium - the submit guard changed the step without the bookkeeping.**
`handleSubmit` called `setStep(outstanding[0].step)` directly rather than
`goToStep`, so it neither recorded the visit nor scrolled to the heading. It is
not reachable as a defect today, because `outstandingErrors` is gathered from
step one upward and only step one validates, so the target is always a step
already visited. It is still the wrong shape: `visitedSteps` had one writer and
one silent competitor, and this is the guard path that exists precisely for the
case where something has gone wrong. Now `goToStep`.

**Medium - a label that did not fit would have painted over its neighbour.**
The label span had `min-w-0` on its column and no overflow rule, so an
overlong single word would have overflowed the button's box rather than being
contained by it. "Review" clears its 45px at 320px by roughly 2px, which a wider
system font or a text-only enlargement would swallow. `break-words` added: the
worst case is now a two-line label inside its own button, which the 60px button
height accommodates.

**Low - the tick had no spoken equivalent.** Visited steps are marked with a
`Check` icon inside an `aria-hidden` span, so a screen-reader user got the
active step (`aria-current`) and the unreachable ones (`disabled`) but no way to
tell which had been opened. The accessible name now ends ", already visited"
where it applies.

**Low - a comment overclaimed.** The `contents` doc comment said it was "kept in
step with the review summary's groups", implying a mechanism. There is none; it
is prose maintained by hand. The comment now says so.

**Checked and found sound:** `new Set(prev).add(clamped)` copies before adding,
so no shared state is mutated, and the identity guard means an unchanged visit
set does not re-render; every `setStep(FIRST_STEP)` reset is paired with a
`visitedSteps` reset; no effect lives inside a conditionally rendered step
block, so jumping past steps two to four cannot skip initialisation - all state
is held at the top of `InspectionForm`, which is why unmounted steps keep their
values; the stale-error effect clears step-one messages on navigating away
because `validateStep` returns nothing for later steps; and the disabled-active
button case cannot arise, since `canJumpAhead` is false only when step one is
invalid, and step one's errors sort first.

## 9. Database Connections (MCP Server)

None. Presentation and navigation only.

