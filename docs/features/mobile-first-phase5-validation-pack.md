# Phase 5 — Moderated Usability Validation Pack

**Date:** 01/09/2026
**Status:** Ready to run — the sessions themselves are the owner's to conduct
**Programme:** Mobile-first over-50 UX remediation, parent plan section 9

## 1. Why this exists before any Phase 5 code

The parent plan gates the dashboard work: *"Validate with representative users before
removing or relocating information"*, and *"Propose a task-oriented Today hierarchy
rather than changing every dashboard section at once."*

That gate is deliberate and it is the right one. The dashboard is the screen where a
wrong guess costs the most, because everything else in the application is reached
from it. Phases 1 to 4 fixed things that were demonstrably broken — contrast below
threshold, targets under 44px, text under 14px, work destroyed without a prompt.
None of that needed a user to tell us it was wrong. **Which dashboard sections a
beekeeper actually needs first does need a user to tell us**, and no amount of
further code review will produce that answer.

So Phase 5 starts here: with everything needed to run the sessions, so that the
Phase 5 plan can be written from what they show rather than from assumption.

## 2. Two target outcomes cannot pass as written

Both were written into section 9 before the programme began, and the application has
since been checked against them.

### 2a. The offline criterion describes a capability that does not exist

> "Every participant understands whether an offline action is saved locally,
> synchronised or failed."

There is no local save and no synchronisation. `public/service-worker.js` passes
every non-GET request straight to the network and never queues one — the comment
there is explicit that it must never fabricate a response for a write.
`OfflineIndicator` is a banner reporting `navigator.onLine`, nothing more. Local
inspection drafts were assessed twice during this programme and deliberately deferred
both times.

So of the three states the criterion asks participants to distinguish, **two do not
exist**. A save attempted offline simply fails.

**Recommendation:** rewrite the criterion to what can be true today — *"No
participant believes an action succeeded when it failed"* — and test task 7 as a
failure-communication task rather than a synchronisation one. Whether to build
offline saving at all is a separate product decision, and a large one.

### 2b. "Recover after accidentally pressing Back" tests a known, deliberate gap

Cancel is now guarded on all five record forms. **Browser Back is not**, and that is
a recorded decision, not an oversight: guarding it means manipulating the history
stack, which risks trapping a user who is genuinely trying to leave — a risk the
parent plan's own list warns about.

**Recommendation:** keep the task, because how badly it lands is exactly the evidence
needed to settle whether the trade-off was right. But the facilitator must know that
losing work here is the current expected behaviour, so it is recorded rather than
treated as a bug discovered mid-session.

## 3. Recruitment

Six to eight beekeepers, aged 50–75. The mix matters more than the number:

| Dimension | Aim for |
|---|---|
| Smartphone familiarity | At least two who describe themselves as uncomfortable with apps |
| Eyesight | At least three who wear glasses for close work; at least one who uses phone text enlargement already |
| Scale | A spread from a few hives to fifty-plus — the Hives list behaves very differently at each |
| Existing use | At least two who have never used HiveCraic, and at least two who use it regularly |

The last row is the one most often skipped and most worth keeping. Existing users
reveal what the changes broke; new users reveal what was never clear.

**Screening questions:** how many colonies do you keep; do you record inspections on
a phone in the apiary or write them up later; do you wear glasses for reading; have
you used HiveCraic before and roughly how often.

## 4. Setup

* **Devices:** one 360px-wide and one 390px-wide phone. Both widths are named in the
  parent plan and the bottom navigation was measured against 320px, so a narrower
  device is a bonus rather than a requirement.
* **Light:** run at least half the sessions outdoors in bright daylight. The contrast
  work in Phase 1 targeted AAA specifically for this condition, and it has never been
  observed in it.
* **Posture:** one-handed, standing. Sitting at a table with two hands is not how
  this application is used.
* **Dexterity:** with beekeeping gloves on for at least two participants. This is the
  single most direct test of the 44px and 48px target floors.
* **Zoom:** one full pass at 200% browser zoom, per task 6.

Record the screen if the participant consents. What they say they did and what they
did diverge more than expected.

## 5. Tasks

Each has the wording to read aloud, and what to watch for. Do not explain the
interface; if a participant asks how to do something, note the question and ask what
they would try.

| # | Task | Watch for |
|---|---|---|
| 1 | "Start a new inspection." | Time to first field. Target is 15 seconds. Do they find it from the dashboard, the bottom navigation, or not at all? |
| 2 | "Record today's inspection for hive [X]: queen seen, six frames of brood, calm." | Whether the five steps read as progress or as obstruction. Do they try to save before the review step? |
| 3 | "You have changed your mind — get out of this without saving." | Which control they reach for. Then, separately, ask them to press the phone's Back button and record what happens. See section 2b. |
| 4 | "Find hive [Y] and change its status." | Whether they scroll or search. The search box is new in Phase 4 and has never been observed in use. |
| 5 | "Show only the records from the last three months." | The time-period presets stayed visible in Phase 4 while other filters moved behind a Filters control. Does anyone open Filters looking for this? |
| 6 | Repeat tasks 1, 2 and 4 at 200% zoom. | Horizontal scrolling, clipped controls, anything that reflows badly. |
| 7 | "Save this record with the phone in aeroplane mode." | Whether they understand it failed. See section 2a — it will fail. |
| 8 | "An update is available while you are part-way through an inspection." | The deferred-reload behaviour was verified technically against production; this is whether it is *understood*. |

**Add one task the original list omits**, because Phase 4 changed it and it is the
most dangerous control in the application:

| 9 | "This hive is finished for the season — remove it from your active list." | Do they choose Archive or Delete? Delete is now in the overflow menu and says it cannot be undone; Archive leads. This tests whether that hierarchy reads correctly. |

## 6. Observation sheet

Score each participant per task: completed unaided / completed with a hint /
abandoned. Record time only for task 1.

Against the parent plan's outcomes, revised per section 2:

- [ ] Started an inspection within 15 seconds
- [ ] Completed a common inspection with no facilitator assistance
- [ ] No accidental data loss
- [ ] Did not miss any primary navigation destination
- [ ] Correctly distinguished Save, Cancel, Archive and Delete
- [ ] **Revised:** never believed an action had succeeded when it had failed

Note verbatim quotes wherever a participant narrates confusion. Those are worth more
than the scores when the Phase 5 plan is written.

## 7. What happens afterwards

The Phase 5 plan is written **from the findings**, not before them. The parent plan
asks specifically for a task-oriented "Today" hierarchy proposed rather than a
wholesale dashboard rewrite, so the sessions should be read for one question above
all: *what does a beekeeper need to see first, and what can be one tap away?*

Two things already recorded in the backlog should be revisited with the same
evidence:

* **The compact list view**, deferred from Phase 4 pending a re-measure of whether
  density still matters now that search exists. Task 4 answers this directly.
* **Offline saving**, which section 2a shows is assumed by the acceptance criteria
  but not built. Task 7 will indicate how much it matters in practice.
