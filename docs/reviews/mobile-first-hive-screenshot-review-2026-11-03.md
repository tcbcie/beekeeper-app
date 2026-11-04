# Hive list and cards: screenshot review

**Date:** 3 November 2026  
**Evidence:** Five owner-supplied screenshots of the Hives screen in List and Cards views.  
**Status:** Visual assessment of supplied images complete; interaction and field validation outstanding.

## Assessment

List is the stronger starting point for a mobile field workflow in these screenshots. Hive names, recency and short status lines are easy to scan; consistent separators support comparison. Cards contains valuable detail, but its repeated navigation buttons, identity badges, stores gauge, configuration diagram and Edit action make each hive a long presentation. The field task and the configuration task compete for attention.

Retain both options. Treat List as the candidate default for field use, preserve the user's chosen view and validate that preference with participants. Make Cards a deliberate expanded view, with optional configuration detail, rather than shrinking its text to display more hives.

The images show a useful progression from overview to detail, but neither the list's initial default nor any control's behaviour was observed. Device, CSS viewport, zoom, text size and capture time were not supplied. Screenshot pixels do not establish CSS hit-area dimensions, contrast ratios or real-phone readability. These are not field-study results.

## Evidence register

Private images are stored locally in the Git-ignored scratch directory because they contain account and apiary details. These links work in this workspace and are not portable repository evidence.

| Image | State | Local reference |
| --- | --- | --- |
| 1 | List view: search, selected apiary, filters, counts and first rows | [Image 1](../../.codex-temp/hive-review-2026-11-03/hives-1.png) |
| 2 | List view: later rows and bottom action | [Image 2](../../.codex-temp/hive-review-2026-11-03/hives-2.png) |
| 3 | Cards view: first card, overview action and stores reading | [Image 3](../../.codex-temp/hive-review-2026-11-03/hives-3.png) |
| 4 | Cards view: configuration detail, Edit and next card | [Image 4](../../.codex-temp/hive-review-2026-11-03/hives-4.png) |
| 5 | Cards view: activity, stores date and configuration | [Image 5](../../.codex-temp/hive-review-2026-11-03/hives-5.png) |

## Findings

### H01 — Recency needs an explicit meaning, especially beside an inspection warning

**P1 clarification · Images 1–3 and 5 · Visible ambiguity; date calculation unverified.** List rows show values such as “4d ago” and “23d ago”; cards use a clock badge. The summary says “Need Inspection (14+ days)”, but a card separately shows a more recent Feeding entry and an older Stores date. These may all be valid dates for different activities. Their relationship is not sufficiently explicit to a reader encountering the screen for the first time.

Label the recency metric, for example “Inspected 23 days ago”, if that is what it actually measures. Keep latest activity and stores-reading dates separate. If the summary only applies a time threshold, consider neutral wording such as “Last inspected 14+ days ago”; do not turn an elapsed interval into an implied recommendation without explaining the scheduling rule and context. This review does not recommend a biological inspection interval.

**Acceptance:** users can explain what each date means and why a hive is counted; recent feeding does not look inconsistent with inspection age; the label matches the actual calculation.

### H02 — Cards gives repeated navigation more emphasis than hive identity

**P2 · Images 3–4 · Observed composition.** Each card begins with a large green Overview & Records button before the hive name. The same action repeats on the next card while a large green New inspection button remains fixed below. This distributes primary emphasis across multiple competing controls.

Lead with hive identity and its meaningful status. Make opening the hive a clearly indicated row/title action or a secondary View hive control. Retain a prominent inspection action whose scope is clear. Do not make an entire card clickable if it contains other controls that would create ambiguous or nested interactions.

**Acceptance:** users can quickly identify which hive they are viewing and distinguish opening its history from starting an inspection. The most visually prominent action should match the screen's primary task.

### H03 — Configuration detail makes the expanded view costly to scan

**P2 · Images 3–5 · Observed content density and vertical extent; user cost not measured.** Cards combines location, queen details, identifiers, latest activity, a stores gauge, hive construction, feeder/entrance information and Edit. A single hive spans substantial vertical content. The configuration illustration adds colour and recognisability, but competes with the shorter operational summary.

Keep a compact summary visible and make Hive setup expandable, or place detailed configuration on the hive screen. Preserve the diagram for users who find it useful. Keep separate, purposeful routes for recording an inspection and editing setup. In a single-apiary filter, consider reducing repeated apiary text; retain it in an all-apiaries view where it identifies the hive's location.

**Acceptance:** users can compare several hives without opening configuration details; setup remains easy to discover; no smaller body text or hit areas are introduced to achieve density.

### H04 — The top controls use considerable space before the first hive

**P2 · Image 1 · Observed composition.** The search field and filter row are useful and spacious. The status summary and large List/Cards selector add another layer before the rows. The plus-only control does not state what will be added. The screen also repeats Hives in the header and bottom navigation, which is normal orientation rather than unnecessary duplication by itself.

Keep search and the selected apiary easy to reach. Refine the spacing and view-switch presentation, rather than shrinking the controls. Consider a labelled Add hive action where space permits; otherwise verify its accessible name and user recognition. Make active extra filters and a clear/reset route apparent when filters are applied; the screenshots do not establish whether these are already implemented.

**Acceptance:** users understand the add action, selected scope and current filters, and can reach meaningful results without unnecessary chrome. Test at narrow widths and enlarged text before selecting a more compact layout.

### H05 — The fixed inspection action is discoverable, but its scope needs verification

**P2 validation · All images · Visible affordance; interaction unknown.** New inspection is consistently visible above the labelled bottom navigation. This is a strong field-use affordance. It is also visually detached from individual hive rows, so a user may expect it to apply to the currently viewed hive or selected apiary.

Verify that the action clearly asks for or displays the intended hive and apiary, retains a useful filter context and avoids silently choosing the wrong hive. Distinguish it from a future per-hive inspection action if one is added.

The fixed bar obscures part of the scrolling content at the captured positions. That does not establish a defect: content normally passes under fixed surfaces. Image 2 shows the last visible list rows above the action, but it does not prove all card controls are reachable. Check final-row/card padding, focus visibility and software-keyboard behaviour directly.

**Acceptance:** every row action can be brought fully into view; participants know which hive they are recording before entering observations; the bottom action remains usable with safe areas and keyboard changes.

### H06 — Status styling mixes different visual conventions

**P2 · Images 3–5 · Visual judgement; calculated contrast pending.** Cards combines green/red square badges, neutral identifier chips, coloured queen text, emoji pictograms, a multicolour gauge and a configuration illustration. The Full Size badge in Image 5 appears to have weak text/background separation. List is visually calmer, with text and short status lines.

Use one badge language for states, one for identity metadata and consistent icons for navigation. Keep meaningful colour in queen identification and configuration diagrams, but avoid giving every metadata item the weight of a warning or action. Measure the Full Size badge's foreground/background contrast and determine whether it is informational, disabled or interactive before prescribing the exact treatment. A disabled-looking informational badge can itself be confusing.

**Acceptance:** states and controls remain distinguishable without colour alone; meaningful text meets the applicable contrast target; visual language is shared between List and Cards. Do not claim a measured failure from these screenshots.

### H07 — Stores percentages need clear interpretation and freshness

**P2 validation · Images 3 and 5 · Observed representation; underlying model unverified.** The gauge pairs values such as 75% with Top up and 80% with Enough, with a dated stores observation underneath. The number and gauge can appear more precise or current than an observational estimate. The date is present, which is a strength, but is visually secondary.

State what the percentage represents and whether it is a measured or estimated reading. Keep the observation date clearly attached to the value and make any stale-data status explicit according to a defined product rule. Provide a concise explanation of the status thresholds without assuming that 75% and 80% are incorrect. Do not change the underlying stores model on the basis of screenshots.

**Acceptance:** participants can explain the value, when it was recorded and what the status means; an old reading is not interpreted as a live measurement; the visual gauge agrees with the actual scale and thresholds.

## Strengths to retain

- Search states useful search terms: hive, apiary, tag or queen.
- The selected apiary is explicit and the List/Cards selection is visually clear.
- List names are prominent; separators and alignment make comparison straightforward.
- Operational states such as stores and queen status are stated in words, not just coloured dots.
- The persistent New inspection button is easy to find and has a clear task label.
- Labelled bottom navigation provides consistent orientation, with Hives selected.
- Card detail includes observation dates; preserve this context when simplifying the layout.

## Proposed field-list pattern to validate

A row should prioritise: hive name; explicit inspection recency; one or two meaningful status lines; and a clear route to hive details. Keep less frequent actions in a labelled overflow control. Extra status can expand or be summarised without hiding a critical observation.

Cards should prioritise the same summary and then disclose optional details. The diagram can remain an appealing, useful feature when chosen deliberately. Do not collapse List and Cards into indistinguishable layouts or remove either without evidence of user preference.

A first comparison could use three tasks: find a named hive, identify which hive has a specified unresolved observation, and start an inspection for the correct hive. Record wrong selections, assistance and appearance preferences separately. This is a proposed field-study addition, not a result.

## Review status and next evidence

These findings add rendered evidence to the review's concerns about hierarchy, consistent statuses, task scope and date clarity. They do not confirm whether navigation, dropdowns, overflow menus, inspection saving or offline recovery work correctly. No code, live data or account settings were changed.

Next needed: a typical inspection step and its save/cancel area, ideally including the first and final step. Existing draft/outbox states can be supplied if already present. Do not discard or alter real records to create a screenshot. Device/viewport and text-size information would help interpret scale, but the review can continue with ordinary screenshots.
