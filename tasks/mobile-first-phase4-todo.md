# Task: Mobile-First Phase 4 — Hives and Records Simplification

**Date:** 01/09/2026
**Status:** 4A to 4D complete — awaiting browser verification by the owner
**Plan:** `docs/features/mobile-first-phase4-list-simplification-plan.md`

## 1. Objective

Layer D of the parent plan: search, collapsible filters, fewer persistent card
actions, safer destructive actions. Three read-only surveys ran first — the Hives
screen, the Records screen, and the conventions already in the codebase — and the
third is why almost nothing here is new machinery.

## 2. Execution Plan

### 4A — Safety first

- [x] **Step 1:** Guard the four unguarded edit paths.
- [x] **Step 2:** Convert all seven native `confirm()` calls to the shared dialogue.
- [x] **Step 3:** Give the four silent delete failures an error toast.

**Outcome.** The four Edit buttons on treatment, varroa check, feeding and harvest
cards overwrote the form and reopened the panel with no guard. Editing another
*inspection* was guarded; editing anything else was not. A beekeeper half way
through an inspection who tapped Edit on a feeding record below it lost the
inspection silently. Phase 1 closed six exit paths and Phase 3 added the click
guard — these four were missed because they do not look like exits.

All seven prompts now name what they will destroy ("the varroa check for hive
12-MN+, recorded on 14/08/2026"). The inspection prompt adds that the hive's honey
super count will be reduced, which that delete silently does. The hive prompt says
the delete cannot be undone and points at Archive. Wording lives once in
`src/lib/record-delete-prompts.ts`, following the `DISCARD_INSPECTION_PROMPT`
precedent.

Four Records deletes previously consulted `error` only to decide whether to refetch,
so a failed delete was indistinguishable from a successful one. All now toast.

`openNewRecord` stays deliberately unguarded and synchronous: the deep-link effect
calls it then immediately `router.replace()`s, and awaiting would sequence state
updates after that navigation.

### 4B — Card actions

- [x] **Step 4:** Archive onto the card; Delete into the overflow menu.
- [x] **Step 5:** Un-gate the kebab from archived-only.
- [x] **Step 6:** Give the menu its missing keyboard and ARIA support.
- [x] **Step 7:** Collapse the duplicated unarchive wording.

**Outcome.** The hierarchy was inverted: Delete — a **hard row delete**, not a soft
delete — was a permanently visible red button, Archive was two navigations away on
the hive detail page, and Unarchive, which is reversible, was the thing hidden
behind the kebab.

Now: **Edit** is the only button on the card. The menu holds **Archive** (active
hives), **Unarchive** (archived), and **Delete permanently** last, behind a
separator. Archive remains a navigation to the archive form rather than an inline
action, because it collects a reason and runs `archive_hive_cascade` — disconnecting
the scale, retiring the queen, failing linked tracker rows. A one-tap archive would
hide consequences the form makes explicit.

The menu had no accessibility at all. It now has `aria-expanded`, `aria-controls`,
an accessible name carrying the hive number rather than a bare "More options"
repeated on every card, Escape to close, and focus returned to the trigger. It is a
disclosure rather than an ARIA menu — see the audit below for why the menu roles
added here were removed again.

### 4C — Search

- [x] **Step 8:** Hives — hive number, apiary, QR tag, queen number, status, notes.
- [x] **Step 9:** Records — hive number, notes, treatment product, batch number,
  varroa method, feed type, floral source, archive reason.
- [x] **Step 10:** Make both empty states search-aware.

**Outcome.** Both follow `crm/customers`: plain `useState`, **not persisted, not
debounced**. Both conventions are stated in the codebase and every list already
filters in memory.

`UnifiedRecord` is a discriminated union whose members each carry a different
identifying field, so the searchable surface is described once as a
`SearchableRecord` shape rather than branching per `record_type`.

The Records empty state now says *"Nothing matches X in the records loaded… widen
the time period to load older records"* — because each of the six queries is capped
at `.limit(500)` and a miss is not proof the record is absent.

### 4D — Filters

- [x] **Step 11:** Collapse secondary filters behind a Filters control.
- [x] **Step 12:** Show an active count on it.
- [x] **Step 13:** Add a Clear filters affordance.

**Outcome.** New `src/components/ui/FilterDisclosure.tsx`.

**It is deliberately not `CollapsibleSection`,** which the plan proposed. Reading
that component showed it is built for settings pages — an `<h2>` at `text-xl` inside
a `Panel`. On a list screen that makes "Filters" visually louder than the page
heading, and adding a size variant would put every settings page at risk for one new
caller. What is copied is its *behaviour*, which is the considered part: children
unmounted rather than CSS-hidden so collapsed selects leave the tab order,
`aria-controls` set only while open, and the open state persisted.

Visible on Records: search and the time-period presets, which carry counts.
Collapsed: ownership, record type, apiary, hive, show-archived.
Visible on Hives: search and apiary. Collapsed: ownership, archive state, scales, sort.

**Clear clears exactly what the badge counts**, not `resetFilters()`. That helper
exists, has never been called by anything, and also resets the time period — which
stays visible. Clearing something the user can see, from a control inside a closed
panel, would be a surprise.

### 4E — Verification and documentation

- [x] **Step 14:** Type-check, lint, suite.
- [ ] **Step 15:** Browser verification by the owner.
- [x] **Step 16:** Update the plan, the parent plan and the backlog.

## 3. Verification

No `src` type errors. ESLint 0 errors (3 pre-existing `exhaustive-deps` warnings in
`tasks/page.tsx`). Suite 18 failed files / 137 failed / 661 passed — the standing
pre-existing baseline, unchanged throughout.

**Not yet seen in a browser.** What matters:

- Opening a photo or a menu item from inside either record form must not submit it.
- The Filters badge count must match what the panel actually holds, and Clear must
  empty exactly those.
- The overflow menu at 320px: it is `min-w-[210px]` inside a card.
- Escape closing the menu and returning focus to the kebab.
- A hive delete now names the hive; confirm the name is the one you expect before
  trusting the prompt.

## 3b. QA audit (01/09/2026)

No Critical. One High, one Medium, two Low.

**High — the overflow menu promised keyboard behaviour it did not have.**
4B added `role="menu"`, `role="menuitem"` and `aria-haspopup="menu"`, but not the
rest of the ARIA menu-button pattern: no Up/Down between items, no focus moved into
the menu on open, no Tab-closes. Those roles put assistive technology into menu
mode, where arrow keys are expected and Tab may not traverse the items at all — so
announcing a menu and not behaving like one is worse than announcing nothing.
Downgraded to a disclosure: `aria-expanded` plus `aria-controls`, real buttons and
links in DOM order, Tab working normally. Escape and focus restore are kept. The
alternative — implementing roving arrow-key navigation — was rejected as more
machinery than a three-item action list warrants.

**Medium — the time-period counts contradicted the list once search existed.**
`timePeriodCounts` re-filters by every filter *except* the time period, and 4C did
not add search to it. With a term typed, the buttons would have read "All Time (89)"
beside a list showing three. The search predicate is now one `matchesSearch()`
function called by both memos, so they cannot drift again.

**Low — `archive_notes` was missing from the searchable fields.** Archive records
carry both a reason and free notes; only the reason was searched.

**Low — `ConfirmDialog` does not restore focus on cancel.** Dismissing a delete
prompt drops focus to `<body>` rather than the control that opened it. Pre-existing
and app-wide, not introduced here; recorded for whoever hardens that component.

**Checked and found sound:** the four new edit guards short-circuit when the form is
clean, so no prompt appears without something to lose; `clearCollapsedFilters` on
both screens relies on the existing refetch effects rather than duplicating the
direct `fetchHives` call, avoiding the double fetch the ownership select still does;
the badge count and Clear operate on exactly the same set; `FilterDisclosure` keys
sit under the `hivecraic:filters:` namespace and so are wiped on sign-out with
everything else.

**One limitation worth stating plainly:** the four new guards protect *inspection*
work only, because `InspectionForm` is the sole form reporting dirty state. Editing
a treatment while a part-filled treatment is open still overwrites it silently. That
is unchanged by this phase rather than introduced by it, but it is the same defect
class and will need the same `onDirtyChange` wiring in the other four forms.

## 4. Mistakes made, recorded

* **A stale line index clobbered an unrelated comment.** An earlier splice in the
  same script had added 11 lines, so the second index was computed against the
  pre-edit file. Caught by `tsc`; the line was restored from `HEAD` and the full diff
  re-read. In 4B the same hazard was avoided by editing the later region first — the
  lesson was available and not applied.
* **A `…` typed into a shell heredoc became invalid UTF-8**, the same class of
  corruption as the em-dash mangling during the earlier commit split. Writes are now
  followed by a decode-and-check for replacement characters.

## 5. Deferred

* **The compact list view.** Decision 1 of the plan. Hives cards are `min-h-[280px]`
  with a box-stack diagram adding a row per super and per brood box — about one hive
  per screen on mobile. Search and filters landed first, as agreed; re-measure
  whether density still matters before building it.
* **The 500-row cap on Records.** Six queries, `.limit(500)` each, no pagination and
  nothing in the UI to say so. Search inherits the ceiling. Needs a pagination design.
* **List performance.** The Hives fetch pulls every inspection for every hive on
  every load and every filter change; no card is memoised, so tapping one re-renders
  the list.
* **~60 further native `confirm()` calls** across apiaries, teams, batches, settings,
  admin, tools and CRM — including the user-deletion flow, which chains three with
  emoji warnings. The shared dialogue has 10 callers; native `confirm()` had ~65
  before this phase. The programme's findings register understates this considerably.
* **`hives/page.tsx` and `HiveListCard.tsx` have lost their indentation** — every
  non-blank line sits at a single space. Present since `8e83fdb`, before this
  programme began, so not caused by it. New code here matches the file rather than
  mixing two styles; a Prettier pass as its own commit would fix it properly.
