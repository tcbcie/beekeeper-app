# Save Inspection from Any Step

**Date:** 2 November 2026

## Overview

An inspection could only be saved on step 5 (Review), so recording something on an earlier screen
meant going on to the end. Save Inspection now appears on every step, and Review is an optional last
step. Only hive, date and time are required, all on step 1, so no later step needs to hold a save
back.

## Behaviour

- **Save on every step:** green, labelled Save Inspection, or Update Inspection when editing.
- **Missing hive, date or time:** Save stays tappable on steps 1 to 4. It jumps to step 1, names the
  missing field and moves focus there. Nothing is written. On Review, Save is disabled and the alert
  above it explains why, as before.
- **Enter key:** still moves to the next step, and never saves before Review. Save is `type="button"`
  so that browsers don't treat it as the form's default action.
- **Voice notes:** Save is disabled while a note is recording or being transcribed, because the text
  hasn't reached Notes yet and would be lost. The label says what is happening.
- **Double taps:** every save goes through the existing `useSubmitLock`.

## Layout

On a phone, Previous (an arrow), Next and Save share one row pinned above the keyboard; on the last
step Save takes the place of Next, and Cancel is not shown (Close at the top does that job). On
wider screens they all sit in one row, with Cancel on the right. (Corrected 04/11/2026.) The buttons stay in the page flow,
because a fixed bar would collide with Mel's button and the mobile navigation (see
[record-forms-bottom-save.md](./record-forms-bottom-save.md)).

## Code

`src/components/records/forms/InspectionForm.tsx`:

- `saveInspection` holds the validation and the write, and is called by the Save button.
- `handleSubmit` only handles the form's own submit event: Enter advances before Review.

## Known effects

- Saving from an early step stores values the form filled in for you (Super Fullness, right-sized
  frames and scale weight) without you opening the step that shows them.
- If those values are still loading when Save is tapped, they are left out of that inspection.
- With a preselected hive, step 1 can be saved straight away. Visit details alone are already a valid
  inspection.

Related: [inspection-stepper-legibility-plan.md](./inspection-stepper-legibility-plan.md),
[mobile-first-phase3-inspection-flow-plan.md](./mobile-first-phase3-inspection-flow-plan.md), which
describe the earlier Review-only design.
