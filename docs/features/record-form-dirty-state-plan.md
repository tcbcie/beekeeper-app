# Feature: Unsaved-Work Protection for Every Record Form

**Date:** 01/09/2026
**Status:** D1 to D4 complete — awaiting browser verification by the owner
**Programme:** Mobile-first over-50 UX remediation. Follows the Phase 4 QA audit.

**Outcome.** All five record forms now report unsaved work, so every guard the
programme already built — in-app navigation, the service-worker reload, the close
button, starting another record, opening a different one, and each form's Cancel —
covers all five rather than inspections alone. Discard wording names the record
type. No `src` type errors, ESLint 0 errors, suite unchanged at 18 failed files /
137 failed / 661 passed, including the nine existing inspection dirty-state tests.

**The baseline had to be deferred.** The plan listed "a form whose values arrive
asynchronously after mount would look dirty immediately" as a risk that did not
arise — and it was wrong. All four forms write `formData` again after mounting, from
their record prop and from the hive or apiary a deep link preselected. A baseline
captured on the first committed render therefore reported unsaved work on a form the
user had not touched, which would have put a discard prompt in front of anyone who
opened a new feeding from a hive and then changed their mind. The hook now takes its
baseline one macrotask after mount, once those effects have settled, and reports the
form clean until it does — so the window cannot produce a false prompt either.
`setTimeout` rather than `requestAnimationFrame`, because rAF does not fire in a
background tab and the form would then never be guarded at all.

**Two further notes.** `handleGuardedCancel` is passed to the four forms only;
`InspectionForm` keeps `onCancel={resetForm}` because it guards its own Cancel to
sequence image and voice teardown after consent, and guarding it here as well would
ask twice. And `formType` had to move above the guard that now reads it, so the
prompt can name the open record without a mirroring ref.

## 1. Overview

The programme opened with a P0: a long inspection form could lose substantial work.
Phase 1 closed six exit paths, Phase 3 added the in-app click guard, and Phase 4
closed four more that did not look like exits.

All of that protects **inspections only**, because `InspectionForm` is the sole form
that reports whether it is dirty. The other four record forms — varroa treatment,
varroa check, feeding, harvest — report nothing, so every guard the programme built
treats them as permanently clean.

Concretely, today: type half a varroa treatment, tap Edit on another record, and it
is gone. No prompt. The same is true of closing the panel, starting a new record,
navigating away in-app, and a service-worker update reloading the tab.

## 2. Scope

* **In Scope:**
  - A shared hook holding the dirty-state pattern that currently lives inline in
    `InspectionForm`.
  - `onDirtyChange` on `VarroaTreatmentForm`, `VarroaCheckForm`, `FeedingForm` and
    `HarvestForm`.
  - Generalising the records page's inspection-specific dirty tracking so all five
    forms feed the guards that already exist.
  - Discard wording that names the record type rather than always saying
    "inspection".
* **Out of Scope:**
  - **Refactoring `InspectionForm` onto the new hook.** Section 4 explains.
  - The archive form, which is an inline `<form>` in the page with three fields and
    no separate component. It can follow later if it proves worth guarding.
  - Any change to what the forms submit, or to the guards themselves — they already
    work, they are simply never told about four of the five forms.

## 3. Technical Design

### The hook

`InspectionForm` holds five pieces that are identical for any form: capture a
baseline snapshot once, compare a serialised snapshot against it, report changes
upward, clear the flag on unmount, and warn on `beforeunload`. Only the *what* being
serialised differs.

That moves to `src/hooks/useFormDirtyState.ts`:

```
useFormDirtyState({ value, extraDirty?, onDirtyChange? })
  → { isDirty, markPristine }
```

`extraDirty` covers state that is not part of the serialised value but still counts
as work — an attached image file, an in-flight voice recording. `markPristine`
re-baselines after a save or when the form is handed different `initialData`.

### The four forms

Each gains an optional `onDirtyChange` prop and one hook call over its existing
`formData`. `VarroaCheckForm` also passes `imageFile !== null` as `extraDirty`; it is
the only one of the four with an attachment.

Optional, so nothing else that renders these forms has to change.

### The page

`inspectionDirty`, `inspectionDirtyRef` and `handleInspectionDirtyChange` become
form-level rather than inspection-level, and all five forms report into them. Every
consumer already downstream — `useNavigationGuard`, `registerUnsavedWorkGuard`,
`useReportFormActive`, the close button, starting a new record, opening another
record — then covers all five without further change. That is the point of the
design: the guards are sound, they were simply blind to four forms.

The four forms currently pass `onCancel={resetForm}` unguarded. They get a guarded
handler instead. `InspectionForm` keeps guarding its own Cancel, because it must
sequence image and voice teardown after consent — the existing comment in
`src/lib/inspection-discard.ts` explains why that one is different, and it stays.

### Wording

`DISCARD_INSPECTION_PROMPT` becomes one case of `buildDiscardRecordPrompt(label)`, so
a half-finished feeding is not described as an inspection. The existing constant is
kept as an alias: `InspectionForm` and `tests/components/records/inspection-dirty-state.test.tsx`
both reference it, and changing that is churn with no benefit.

## 4. Why `InspectionForm` is not refactored onto the hook

It is the obvious tidy-up and it is deliberately deferred.

That component carries roughly twenty-five committed behaviours and eight
already-fixed defects, and this programme has twice chosen re-arrangement over
rewriting it for exactly that reason. Its dirty tracking additionally re-baselines in
two places — after a save, and when `initialData` changes — which the hook supports
but which are the fiddliest part of its lifecycle.

The hook is designed to accept it later. Doing both at once would mean that if the
result misbehaves, it is unclear whether the hook or the migration is at fault.

The cost of waiting is one duplicated implementation, and it is the *source* of the
hook rather than a divergent copy.

## 5. Edge Cases & Risks

* **Double prompting.** If a form guards its own Cancel and the page also guards the
  handler it passes, the user is asked twice. Only `InspectionForm` guards its own,
  so the page must guard the other four and not that one.
* **Baseline timing.** The baseline is captured on first committed render. A form
  whose `formData` is populated asynchronously after mount would look dirty
  immediately. The four forms take their initial values from props at construction,
  so this does not arise — but it is why `markPristine` exists.
* **`resetForm` clears every editing slot at once.** The guarded cancel must resolve
  before it runs, or the form is replaced while the prompt is still open.
* **Serialisation of `undefined`.** `JSON.stringify` drops undefined properties, so a
  field going from `undefined` to absent reads as unchanged. Acceptable: it errs
  towards not prompting, and the existing implementation has the same property.
* **A dirty form plus impersonation.** Out of scope here, as in the drafts audit.

## 6. Implementation Phases

1. **D1** — the hook.
2. **D2** — the four forms.
3. **D3** — the page: form-level dirty state, guarded cancel, per-type wording.
4. **D4** — verify with type-check, lint and the suite; update the backlog.

## 7. Database Connections (MCP Server)

None. Client-side state only.
