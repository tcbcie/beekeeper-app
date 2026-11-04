# Dashboard screenshot review

**Date:** 3 November 2026  
**Evidence:** Six screenshots supplied by the owner, showing the authenticated dashboard at different scroll positions.  
**Status:** Visual review complete for these images; interaction, device and field validation remain pending.

## Assessment

The dashboard has a recognisable, welcoming visual identity. Warm neutral backgrounds, forest green, clear black text, a serif greeting and labelled bottom navigation work well together. The screenshots support refinement of this identity rather than a replacement design system.

The strongest improvement is to make importance easier to recognise. Immediate observations, planned work, historical context and seasonal reading receive substantial screen space and similar card treatment. Some wording and emphasis conflict with the action a beekeeper needs to take. Better prioritisation and more consistent presentation would make the app feel calmer and more polished without shrinking its readable text.

These images are visual evidence of the authenticated dashboard, not evidence of a completed field study. Browser, device, CSS viewport, zoom, text-scaling settings and exact capture times were not supplied. The footer displays v1.14.0. Image dimensions must not be treated as CSS pixels or physical touch-target sizes. Different crops show different portions of the page; they do not establish the number of swipes required on a real phone.

## Evidence register

The originals contain personal and apiary information. Local copies are retained in the Git-ignored review scratch directory, not in the report's tracked screenshot collection. Links below work in this workspace; they will not travel with a repository checkout. References use the owner's image numbering.

| Image | Visible area | Local evidence |
| --- | --- | --- |
| 1 | Greeting, quick actions and seasonal food card | [Image 1](../../.codex-temp/dashboard-review-2026-11-03/dashboard-1.png) |
| 2 | Jobs grouped by apiary and bottom navigation | [Image 2](../../.codex-temp/dashboard-review-2026-11-03/dashboard-2.png) |
| 3 | End of jobs and apiary list | [Image 3](../../.codex-temp/dashboard-review-2026-11-03/dashboard-3.png) |
| 4 | Seasonal guidance and recent-visits heading | [Image 4](../../.codex-temp/dashboard-review-2026-11-03/dashboard-4.png) |
| 5 | Recent visits | [Image 5](../../.codex-temp/dashboard-review-2026-11-03/dashboard-5.png) |
| 6 | Recent-visits footer and collaboration section | [Image 6](../../.codex-temp/dashboard-review-2026-11-03/dashboard-6.png) |

## Findings and recommendations

### D01 — The opening seasonal message contradicts the work beneath it

**P1 · Image 1 · Observed wording conflict.** The prominent card says “Winter: nothing to do”, followed immediately by “Do they have enough food?”, “1 hive needs a look” and a feed-recording action. Even if the first phrase means that routine inspections are paused, it reads as a general assurance that no work is needed.

Use a neutral seasonal label such as “Winter checks”. Let the actual data state the next action. This is a communication finding, not advice to inspect or feed any particular colony. Seasonal and operational advice should continue to follow the application's intended beekeeping rules.

**Acceptance:** the opening seasonal label cannot contradict the card's findings; participants can explain what requires attention without having the conflict explained to them.

### D02 — Historical observations and current jobs are difficult to distinguish

**P1 validation · Images 2–3 · Observed presentation; underlying task state unverified.** The To do section combines queen-status observations, a due task, an aggregation of further tasks and a longer-term queen-age advisory. Red and blue dots, generic Open/Tasks buttons and small explanatory lines do much of the differentiation. A reader has to work out which entries require action now and which are recorded context.

Keep apiary grouping, but explicitly distinguish “Needs attention”, “Planned tasks” and “Recorded observations”, or use concise state labels within a single list. Show the relevant date and resolution/action status. Do not infer urgency from a colour or turn every historical record into an unresolved job. The screenshots alone cannot establish whether any entry is incorrectly classified.

**Acceptance:** participants distinguish an actionable task from a historical observation and understand what the job count includes. Do not change the classification logic until the underlying meaning has been checked.

### D03 — The main list of places comes after substantial dashboard detail

**P2 · Images 1–3 · Observed ordering; cost to users needs validation.** Seasonal information and a multi-row job list precede My apiaries. This supports reviewing priorities, but can delay people who open the app to find a hive or record a visit. The visible quick actions are a useful mitigation and should be retained.

Try a shorter attention summary followed by My apiaries, with the full job list available through a clear link or expansion. Compare this with the existing order before moving sections. Preserve access to longer lists rather than merely hiding work.

**Acceptance:** new and regular users can find their apiary and begin the appropriate record unaided; the revised layout does not make urgent observations easier to miss. Measure task success and preference instead of assuming that less scrolling is always better.

### D04 — Card weight and spacing vary more than their meaning requires

**P2 · Images 1–6 · Visual design judgement.** Seasonal and guidance panels have large rounded corners; apiary rows have smaller corners and stronger shadows; recent visits use thin outlined rectangles inside another panel; collaboration is a spacious panel with a centred wrapped title. Each pattern is individually understandable, but the combination makes the dashboard feel like several component families.

Define a small set of surface roles: section, clickable list row and highlighted status. Use consistent corner radii, borders and vertical spacing for each role. Give clickable rows a clear affordance without relying on heavier shadows. Keep generous text and touch areas; reduce duplicated framing and excess panel padding before reducing content size.

**Acceptance:** equivalent rows and sections look related across the dashboard, while interactive and informational surfaces remain distinguishable. Review a continuous page capture as well as individual cards.

### D05 — Secondary reading occupies a large part of the dashboard

**P2 · Images 4–6 · Observed content volume; user preference unknown.** The seasonal guidance is useful and readable but long. Five recent visits are shown as separate blocks before collaboration and the version footer. These are valuable reference materials, but their default expansion competes with the immediate field task.

Consider a short seasonal summary with “Read November guidance”, and the latest two or three visits with “View all records”. Keep expansion predictable and preserve useful detail for those who want it. Treat the numbers as design candidates, not a fixed requirement.

**Acceptance:** participants can still find seasonal advice and previous visits, while the main task is easier to locate. Compare both arrangements; do not remove information solely because it is below the fold.

### D06 — Status words and buttons are not consistently distinguishable

**P2 · Images 1–3 · Observed styling; click behaviour unknown.** The pill “Steady”, the partially visible “Heft” pill and the job-count pills use similar compact status treatment, while “Record feed” is outlined as an action. “Heft” is phrased as an instruction rather than a state. The screenshots do not show whether these pills are clickable.

Use pills for states such as “Check needed” or “No change”, and buttons/links for actions such as “Record check”. If a job-count pill is informational, make the row's navigation affordance do the interactive work. Keep colour plus words; do not remove the helpful textual labels.

**Acceptance:** users can identify what they can tap and distinguish a status from a suggested action without trial and error.

### D07 — The assistant button has stronger visual emphasis than its apparent role

**P2 validation · Images 1–6 · Observed prominence; meaning/frequency unverified.** A bright green circular speech-bubble button remains prominent in the header. Its visible icon suggests chat/help but gives no textual indication of which. It competes with the quieter dashboard actions.

Verify its accessible name separately, and test whether people understand the icon. Consider a quieter labelled Help/Assistant control if that reflects its actual role and frequency of use. Do not rename it based on the icon alone or reduce its hit area to make it less prominent.

**Acceptance:** participants correctly predict what opens; the control remains discoverable but does not distract from the core field actions.

### D08 — Bright text links warrant measured contrast verification

**P2 verification · Images 5–6 · Visible concern, not a pixel-derived ratio.** View All Records and View Changes appear brighter and lighter than the dark-green Plan visit links in earlier screenshots. This supports the original source finding F04 about inconsistent forest text colours.

Use the approved accessible link token consistently, with a clear link affordance. Confirm computed foreground/background colours in the authenticated screen before claiming a measured contrast failure from these images. Screenshot scaling and compression make exact visual comparison insufficient.

**Acceptance:** link contrast and appearance are consistent on their actual surfaces in both themes, including focus and hover states.

## Strengths to preserve

- Bottom navigation combines icons with explicit Home, Hives, Records, Tasks and More labels. Active Home has both a recognisable icon and a consistent colour. Touch sizes and assistive-technology state still need direct measurement.
- The two main actions are conspicuous, clearly worded and spacious. Keep them easy to find when refining the header.
- Primary text is visually substantial and the cream/white/forest palette feels appropriate to a practical journal. Do not make the app colder or denser merely to imitate a desktop dashboard.
- Apiary rows expose the name, hive count, last visit and job count together. This is useful scanning information, with a clear chevron.
- Status is usually expressed in words as well as colour, which is preferable to dots alone.
- The seasonal card asks a concrete question tied to the user's records. Preserve that useful contextual role while fixing its contradictory label.

## Fixed header and bottom navigation: no defect established from the crops

Some content is partially behind the header or bottom navigation at the captured scroll positions. This is normal for a scrollable page with fixed bars and does not by itself prove permanent obstruction. The final screenshot shows the footer above the bottom bar, which is reassuring but not a full reachability check. Test whether every control can be scrolled into view, whether focused controls remain visible and whether keyboard/safe-area changes alter that result. Do not add padding indiscriminately from these crops alone.

## Suggested dashboard composition to test

1. Compact brand/header and greeting, retaining the existing two quick actions.
2. A concise seasonal/attention summary with truthful status wording.
3. My apiaries with name, visit recency and clearly defined outstanding work.
4. A compact task summary with access to the full grouped list.
5. Expandable seasonal guidance, recent visits and collaboration.

This is a testable proposal, not an approved redesign or a demonstrated participant preference. If the main user task is triaging work across apiaries, keep the task summary before the apiary list and test both variants. An Admin badge is visible here; the visual emphasis should also be checked using an ordinary user account.

## Effect on the review and next evidence

The dashboard is now visually reviewed from owner-supplied screenshots. This supports F10's consistency assessment and adds D01's concrete wording conflict. F09's mobile quick-action behaviour remains untested: a screenshot cannot reveal what happens after tapping New inspection. The original draft, outbox, form-semantic and navigation findings retain their earlier evidence levels.

Next useful screenshots are a hive list/detail, a typical inspection step, the final save area and any existing draft/outbox state. Please capture only states already available; do not delete drafts or create failures in live records to produce evidence. Real-device interactions and anonymised participant observations remain necessary for the field-study component.
