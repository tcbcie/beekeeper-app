# Inspection flow: screenshot review

**Date:** 4 November 2026  
**Evidence:** Six owner-supplied screenshots covering all five stages of Edit Inspection, including the final review and fixed action bar.  
**Status:** Visual assessment complete for the supplied edit flow. New-inspection, save outcomes, recovery and real-device interaction remain unverified.

## Assessment

This is the strongest structured workflow shown so far. Stage names, progress, substantial field text, large-looking choice buttons, optional sections and a persistent action bar provide a clear foundation. The final summary offers direct Edit links, avoiding the need to retrace every stage.

The priority is clarity of decisions and meaning: distinguish progressing from saving, explain the rating scales, and make review copy accurately describe editing an existing record. Visual refinement should reinforce this structure, rather than replace it with another form framework.

The screenshots show edit mode, not a new inspection. They do not prove that saving works, whether existing values changed, whether navigation discards data or how the software keyboard affects the layout. Browser, CSS viewport, text scaling and physical device are unknown. Target sizes and contrast are not measured from screenshot pixels. No participant findings are implied.

## Evidence register

These images contain personal apiary details and inspection notes. Original copies are retained only in the Git-ignored scratch directory; this report does not reproduce the private notes. Local evidence links are workspace-only and will not accompany a repository checkout.

| Image | Visible state | Evidence |
| --- | --- | --- |
| 1 | Edit Inspection: Hive and visit, step 1 | [Image 1](../../.codex-temp/inspection-review-2026-11-04/inspection-1.png) |
| 2 | Queen and colony, step 2 | [Image 2](../../.codex-temp/inspection-review-2026-11-04/inspection-2.png) |
| 3 | Health and behaviour, step 3 | [Image 3](../../.codex-temp/inspection-review-2026-11-04/inspection-3.png) |
| 4 | Notes and follow-up, step 4, notes and voice action | [Image 4](../../.codex-temp/inspection-review-2026-11-04/inspection-4.png) |
| 5 | Step 4, follow-up and photo attachment area | [Image 5](../../.codex-temp/inspection-review-2026-11-04/inspection-5.png) |
| 6 | Review and save, step 5 | [Image 6](../../.codex-temp/inspection-review-2026-11-04/inspection-6.png) |

## Findings

### I01 — Edit-mode review copy misstates the record's status

**P1 · Images 1, 4 and 6 · Confirmed visible wording mismatch.** The form is titled Edit Inspection and ends with Update Inspection. The review instruction nevertheless says “Nothing has been recorded yet”. This can be read as saying the existing inspection does not exist or that earlier information was lost. It may intend to describe unsaved changes, but does not say so.

Use mode-specific wording: “Review your changes before updating this inspection.” If needed, explain that the existing record is unchanged until the update succeeds. New-inspection copy should distinguish an unsaved form, a locally saved draft, a queued inspection and server receipt according to actual state; a single generic assurance cannot represent them all.

**Acceptance:** edit and create flows use accurate wording before, during and after saving. A queued update must not be described as server-confirmed. Participants can explain whether they are creating a record or changing one and whether their changes have been saved.

### I02 — Next and Update compete as equally primary actions

**P1 design validation · Images 1–5 · Observed visual hierarchy; accidental saving not demonstrated.** Next and Update Inspection are side by side, similarly sized and both solid green. One advances within the form and the other commits changes. Equal emphasis makes the choice harder than necessary, particularly when attention is divided.

Preserve the useful ability to save without visiting every optional stage. On intermediate stages, give Next clear progression emphasis and keep an explicitly labelled secondary save action. On the final stage, make Save changes the single primary action. “Save changes” is a shorter candidate for edit mode, not a mandate to rename every save action in the app. Do not force completion of optional sections merely to simplify the footer.

**Acceptance:** users correctly predict both actions, can deliberately save early, and do not update an inspection when intending to continue. Confirm actual behaviour and validation before changing labels or styles.

### I03 — Stars do not explain what a rating means

**P1 · Image 3 · Confirmed absence of visible scale anchors in the supplied view; other help and accessible names unverified.** Temperament, Brood Pattern and Swarming Tendency each show five otherwise identical star buttons. The screen does not explain what the low and high ends represent. In particular, a high swarming-tendency value could describe more tendency, while a conventional star rating suggests a better result.

Provide concise descriptive anchors for each metric, and show the selected description near the group. Consider numbered or verbally labelled choices where they better express the established recording scale. Preserve historical meaning and data mapping: do not reverse a scale or reinterpret old values to fit a new visual design. Verify the existing model before choosing exact labels.

**Acceptance:** participants can identify the scale direction and interpret their choice without guessing. Screen-reader names expose the value and meaning; selection is not shown by colour alone. Visual and accessible labels agree with stored data.

### I04 — Checkmarks may imply completion when they only mean a stage was visited

**P2 validation · Images 2–6 · Visible presentation; state logic not verified here.** Earlier steps acquire ticks as the user moves forward. Health is ticked on the review screen, while the earlier Health screenshot shows unselected ratings. That sequence does not prove nothing was entered later, and the screenshots cannot establish whether ticks mean visited, valid or completed.

Define one meaning for the indicator and communicate it consistently. If it means visited, avoid presenting it as confirmation that observations were recorded or reviewed. Keep optional and unrecorded states understandable. Likewise, verify whether an unchecked Queen Seen or Eggs Present means not seen, absent or not recorded; these are different observations and should not be silently conflated.

**Acceptance:** stage indicators describe their actual state; users can leave optional data unrecorded without it looking like a negative finding. The review summary and stored values preserve the distinction between unknown, no and a recorded numeric value.

### I05 — The form needs persistent hive context and a clear exit

**P2 validation · Images 1–6 · Observed context is limited in later views; exit behaviour unknown.** Hive and apiary are explicit on the first and review stages, but are not visible in the supplied middle-stage views. The title is generic Edit Inspection. A person interrupted during a visit may need to re-establish which hive they are editing. The close icon is visible in Images 1 and 4; Back is an arrow in the footer. A visible Cancel label is not shown.

Consider a compact context line with hive identity and visit date near the stage header, without consuming a large extra fixed bar. Use an accessible name for Close and Back; decide whether visible Back text improves clarity at the available width. Verify that Close explains the consequences for unsaved edits and that Back within the form does not imply leaving the record.

These images do not establish that close controls become permanently inaccessible when scrolled. Check reachability and focus directly rather than inferring a defect from their absence in a crop.

**Acceptance:** participants identify the hive after an interruption, distinguish previous-stage navigation from leaving the form, and can exit without accidental loss. Dirty-form confirmation and draft protection are separate technical checks.

### I06 — Voice and photo input need the same visual and mobile language as the form

**P2 · Images 4–5 · Observed styling and copy; recording/upload behaviour untested.** Record voice note is a vivid purple full-width button, visually louder than most of the notes section. Photo attachment copy says “Click to upload or drag and drop”, which describes desktop interaction. The purpose and optional nature of photos are otherwise clear.

Keep voice input easy to discover because it may reduce typing, but give it a consistent secondary-action treatment. Use touch-appropriate attachment wording, such as “Add photos”, with device capabilities described only when supported. Do not promise camera capture, transcription or offline recording unless those behaviours have been verified. Keep useful limits available without letting file-format detail dominate the task.

**Acceptance:** people recognise voice and photo entry as optional alternatives, understand whether recording is active and what will be saved, and can recover from denied permissions or failed attachments. Test environmental noise and gloves in real sessions; this screenshot review does not establish voice usability outdoors.

### I07 — The five-column stepper and three-part footer need enlarged-text testing

**P2 validation · All images · Structure observed; overflow not reproduced.** At the captured size, step names and action labels are readable. Five fixed-looking step columns and a footer containing Back, Next and the relatively long Update Inspection label could become cramped at narrower widths or larger text. Long stage descriptions and repeated section headings add to the vertical content, but their explanatory value should be preserved where useful.

Test the actual layout at narrow widths, supported 200% text enlargement and with the software keyboard open. If needed, allow a simpler “Step 2 of 5: Queen” presentation with an accessible route to other stages, and let actions wrap or use shorter accurate labels. Maintain non-overlapping hit areas and correct reading order.

Content passing behind the fixed action bar is not itself a defect. Verify that every field, Clear action and attachment control can be scrolled fully above it and remains visible when focused. No exact touch-size or sticky-bar failure is claimed from these crops.

**Acceptance:** steps and actions remain readable and operable under enlargement; all fields are reachable with the keyboard shown; focus is never hidden behind the fixed footer; no action relies on horizontal page scrolling.

## Strengths to retain

- The five stages have recognisable names, with a visible current stage and numeric progress.
- Labels sit above substantial input fields; the first stage groups location and visit details coherently.
- Number choices reduce typing and look spacious in the supplied view. Confirm their actual target bounds rather than judging the digit size.
- Health and Notes explicitly indicate that they are optional.
- Given/Taken and Next Visit Plan use progressive disclosure to limit initial complexity.
- Notes use readable text and a generously sized field; voice and photos offer alternatives to typing.
- The persistent action bar keeps progression and saving discoverable.
- The final summary groups information by topic and provides direct Edit links. Preserve this ability to correct details without retracing the whole form.
- The final stage already reduces the action hierarchy to one large update action, providing a useful model for a consistent save pattern.

## Candidate bounded changes for the eventual plan

| Order | Work | Evidence | Verification |
| --- | --- | --- | --- |
| 1 | Correct edit-mode review copy and state wording | I01 | Existing record, unsaved edits, failed save and successful update all described accurately. |
| 2 | Clarify progression versus saving | I02 | Users select Next or Save changes intentionally; early save stays available. |
| 3 | Anchor each rating scale and preserve data semantics | I03–I04 | Meaning and direction match stored values; unknown is distinct from negative. |
| 4 | Improve context, exit clarity and attachment language | I05–I06 | Interrupted users regain context; optional inputs and exit consequences are understood. |
| 5 | Validate enlarged text, keyboard and sticky actions | I07 | Real-device and browser evidence demonstrates reachability and reflow. |

These are recommendations for a later implementation plan. No code, inspection record, account setting or attachment has been changed.

## Coverage and remaining research

The screenshot review now covers the dashboard, hive List/Cards and all five stages of editing an inspection. New-inspection defaults, selected ratings, field-validation errors, unsaved-exit prompts, saving feedback, existing draft/outbox screens and dark/enlarged-text authenticated views remain unobserved. Do not manufacture these states by discarding or altering live records.

The field-study pack remains ready for real sessions. Add two comprehension probes: “What would happen if you chose each bottom button?” and “What does this rating mean?” Ask these before explaining the interface, and record understanding separately from preference. The first supplied note and all personal identifiers should remain excluded from published research material.
