# Feature: Mobile-First Phase 4 — Hives and Records Simplification

**Date:** 31/08/2026
**Status:** 4A to 4D implemented — awaiting browser verification by the owner
**Task record:** `tasks/mobile-first-phase4-todo.md`
**Programme:** Mobile-first over-50 UX remediation. See
`mobile-first-over-50-ux-remediation-plan.md` section 12 for current state.

**Deviation from section 5D:** the Filters panel is a new
`src/components/ui/FilterDisclosure.tsx`, not `CollapsibleSection`. That component is
built for settings pages — an `<h2>` at `text-xl` inside a `Panel` — which on a list
screen makes "Filters" louder than the page heading, and adding a size variant would
put every settings page at risk for one new caller. Its *behaviour* is copied:
children unmounted rather than hidden, `aria-controls` only while open, state
persisted. Nothing in `CollapsibleSection` was changed, so its `profile:` key prefix
did not need generalising after all.

## 1. Overview

Phase 4 of the programme, covering Layer D of the parent plan: search, collapsible
filters, fewer persistent card actions, safer destructive actions, and an optional
compact view.

Three read-only surveys were run before writing this: the Hives screen, the Records
screen, and the conventions that already exist elsewhere in the application. The
third one matters most — almost everything this phase needs already has a house
pattern, and the plan below reuses rather than invents.

The surveys also found two defects that are not presentation problems at all. They
are described in section 3 and take priority over everything else in this phase.

## 2. What already exists, and will be reused

| Need | Existing pattern |
|---|---|
| Confirmation | `useConfirm` / `ConfirmProvider`, mounted app-wide. Ten callers. Shared wording goes in a `src/lib/*.ts` constant, as `DISCARD_INSPECTION_PROMPT` does. |
| Text search | `crm/customers/page.tsx` — `useMemo` plus `[fields].some(f => f?.toLowerCase().includes(q))`, with `TextInput` and an inset icon. |
| Collapsible section | `ui/CollapsibleSection.tsx`, which unmounts children rather than hiding them, so collapsed controls are not tabbable. Its `summary` prop exists precisely to report state while closed. |
| Overflow menu | Already wired end to end on `HiveListCard`, with `openMenuId` lifted to the page so only one opens at a time. |
| Persistence | `usePersistentState`, namespace `hivecraic:filters:`, keys shaped `page:name`. Cleared on sign-out. |
| Archive | `archive_hive_cascade` RPC — the only correct path, because it also disconnects the scale, retires the queen and fails linked tracker rows atomically. |

Two conventions are explicit in the code and will be followed rather than
re-litigated: **search text is ephemeral and never persisted**, while **filters are
persisted**; and nothing in this codebase debounces search, because every list is
already filtered in memory.

## 3. Two defects that come first

### 3a. Four unguarded edit paths destroy an in-progress inspection

Phase 1 closed six exit paths that could lose a part-finished inspection, and Phase 3
added the in-app click guard. Four paths were missed, because they do not look like
exits: the **Edit** buttons on the treatment, varroa check, feeding and harvest cards.

`handleTreatmentEdit`, `handleCheckEdit`, `handleFeedingEdit` and `handleHarvestEdit`
overwrite the form state and reopen the panel with no guard at all. Editing another
*inspection* is guarded (`page.tsx:884`); editing any other record type is not. So a
beekeeper who has typed half an inspection and then taps Edit on a feeding record
below it loses the inspection silently, with no prompt.

This is the same class of P0 the programme opened with, and it is fixed first.

### 3b. The destructive-action hierarchy on Hives is inverted

On every owned hive card, **Delete** is a permanently visible red button. It performs
a **hard row delete** — `.delete()` on `hives`, not a soft delete — guarded only by
`confirm('Are you sure you want to delete this hive?')`, which does not name the hive.
The result is not checked for the user's benefit: `error` decides only whether to
refetch, so a delete that fails looks exactly like one that succeeded.

Meanwhile **Archive**, the safe and reversible option, is not on the card at all. It
takes two navigations to reach: card, then hive detail, then a link into the Records
page form. And **Unarchive**, which is also reversible, *is* hidden behind a kebab
menu.

So the one irreversible action is the most prominent secondary control on the card,
and both reversible ones are buried. The parent plan asks to "prefer Archive to
Delete"; the actual state is stronger than that phrasing suggests.

## 4. Scope

* **In Scope:**
  - The four unguarded edit paths (3a).
  - All seven remaining native `confirm()` calls — five on Records, two on Hives —
    moved to the shared dialog, each naming what it will destroy.
  - Silent delete failures on four Records handlers.
  - Archive promoted onto the Hives card; Delete demoted into the overflow menu.
  - The existing kebab un-gated from archived-only, and given the keyboard and ARIA
    support it currently lacks.
  - Text search on both screens.
  - Secondary filters collapsed behind a Filters control showing an active count,
    with common presets left visible.
  - A Clear filters affordance. `resetFilters` already exists on Records and has
    never been called by anything.
* **Out of Scope:**
  - **The 500-row cap on Records.** Each of six queries is `.limit(500)` with no
    pagination and no indication in the UI. A user with 600 inspections silently
    loses the oldest 100, and the time-period counts are computed from the truncated
    set, so "All Time (500)" can be untrue. Search would inherit the same ceiling.
    This needs a pagination design, not a rider on this phase — but it bounds what
    search can honestly promise and must be recorded.
  - **List performance.** The Hives fetch pulls every inspection for every hive,
    unlimited, on every load and every filter change; no card is memoised, so
    tapping one card re-renders the whole list. Real, and separate.
  - Changing what archiving collects. It gathers a reason and notes through a form,
    and that stays.
  - The dashboard (Phase 5).

## 5. Technical Design

### A. Safety first

**The four edit paths** gain the same guard the inspection edit path already uses:
`if (!(await confirmDiscardInspection())) return`. The helper already exists and
short-circuits to `true` when the form is clean, so the prompt only appears when
there is genuinely something to lose.

**The seven `confirm()` calls** become `confirmDialog({...})` with `variant: 'danger'`
and a message naming the record — its hive number and date — rather than the present
generic wording. On a list of ninety records, "Are you sure you want to delete this
inspection?" does not tell a beekeeper which one they are about to destroy.

Both pages already import `useConfirm` as `confirmDialog`, named that way
specifically to avoid shadowing `window.confirm`. Once no native calls remain, that
precaution can be retired — but the rename stays, because renaming it back is churn
with no benefit.

**The four silent failures** get the same treatment the inspection delete already
has: an error toast. At present a failed delete on a treatment, check, feeding or
harvest is indistinguishable from a successful one.

### B. Archive and Delete on the Hives card

The card's two equal-weight buttons become **Overview & Records** (unchanged, primary)
and **Edit**, with everything else in the overflow menu:

* **Archive** — visible in the menu for active hives, navigating to the existing
  archive form exactly as hive detail does today. This is deliberately *not* an
  inline action: archiving collects a reason and notes, and `archive_hive_cascade`
  also disconnects the scale, retires the queen and fails linked tracker rows. A
  one-tap archive would hide consequences the form currently makes explicit.
* **Unarchive** — for archived hives, as now, but through the shared dialog using the
  wording already migrated in `useHiveDetail.ts`. That logic exists twice today, once
  migrated and once native; the two collapse into one shared constant.
* **Delete** — moves into the menu, last, visually separated, worded to say it cannot
  be undone and to point at Archive as the reversible alternative.

The kebab is currently gated on `hive.archived_at`, so active hives have no menu at
all. That gate is removed. The plumbing — lifted `openMenuId`, outside-click via a
`.context-menu-container` probe, `stopPropagation` on items — already works and is
kept.

**The menu's accessibility is currently absent** and is added here: `aria-haspopup`,
`aria-expanded`, `role="menu"` and `role="menuitem"`, Escape to close, and focus
returned to the trigger. `CollapsibleSection` and `ConfirmDialog` are the in-repo
references for the disclosure and Escape patterns respectively.

### C. Search

Both screens filter entirely in memory already, so search is a predicate added to the
existing memo — no query changes, no new fetch.

* **Hives** match on hive number, apiary name, QR tag code, queen number, status and
  notes.
* **Records** match on hive number and notes, plus the identifying field of each type
  — treatment product and batch number, varroa method, feed type, floral source.

Ephemeral `useState`, no debounce, following the stated convention. Empty-state copy
follows the existing "No records match your search." shape.

### D. Filters

Primary controls stay visible on both screens, because they are how the screens are
actually used: on Records, the time-period presets with their counts; on Hives, the
apiary selector and the archive state.

Everything else moves inside a **Filters** disclosure built on `CollapsibleSection`,
whose `summary` prop carries the active count — "2 filters active". Because that
component unmounts its children rather than hiding them, the collapsed controls leave
the tab order, which is the behaviour we want and is why it is preferred to a
CSS-hidden panel.

`CollapsibleSection` hardcodes a `profile:` prefix on its storage key. That is
generalised to an optional prefix so Hives and Records can persist their own
open/closed state under `hives:filtersOpen` and `records:filtersOpen`.

The active count is computed the same way `timePeriodCounts` already computes counts
under a hypothetical filter state, so there is one technique on the page rather than
two.

**Apiary and hive selections must continue to go through `useSelection`**, not
localStorage — they are shared app-wide, so a choice on Hives carries into Records
and Tasks. Routing them through per-page storage would silently break that.

## 6. Edge Cases & Risks

* **`confirmDiscardInspection` is `async`.** The four edit handlers become `async` and
  must `await` before mutating state, or the guard resolves after the form has
  already been replaced.
* **`openNewRecord` is deliberately unguarded and synchronous** — the deep-link effect
  calls it then immediately `router.replace()`s, and awaiting would sequence state
  updates after that navigation. It must stay that way.
* **The card is itself a click target.** Every record card is wrapped in a
  `cursor-pointer` div with an `onClick` that toggles highlighting, with no `role`,
  `tabIndex` or keyboard handler — and it wraps the Edit and Delete buttons with no
  `stopPropagation`. Moving actions into a menu adds another nested target. The menu
  items must stop propagation, as the Hives kebab items already do.
* **Search plus the 500-row cap.** Searching cannot find what was never fetched. The
  empty state must not imply the record does not exist.
* **A stale persisted filter can be invalid.** The Records validator only checks that
  `timePeriod` is a *string*, so a removed enum value would pass and fall through
  `getDateRange`'s default branch as All Time. Any new persisted key gets a validator
  that checks membership, not type.
* **Selection mode and bulk actions** narrow to owned hives after filtering, so a hive
  filtered out of view is dropped from the operation. Search will interact with this;
  the existing behaviour is correct and should not change silently.
* **Archived hives and Delete.** Delete is owner-only; Archive should be too.

## 7. Implementation Phases

1. **4A — Safety.** The four unguarded edit paths, seven `confirm()` conversions with
   record identity, four silent failures. No visual change.
2. **4B — Card actions.** Archive onto the card, Delete into the menu, kebab un-gated,
   menu accessibility, unarchive de-duplicated.
3. **4C — Search.** Both screens.
4. **4D — Filters.** Disclosure, active count, Clear filters, key generalisation.
5. **4E — Verification and documentation.** Type-check, lint, suite, and updates to
   this document, the parent plan and the backlog.

## 8. Decisions Required Before Implementation

1. **The compact list view.** The parent plan says "consider" it, and it is the single
   biggest lever on scannability: Hives cards are `min-h-[280px]` with a box-stack
   diagram that adds a row per super and per brood box, so the practical density is
   about one hive per screen on mobile. For a beekeeper with 150 hives that is the
   real problem, and search only partly answers it. But it is also the largest new
   surface in the phase, with no existing density precedent to copy.
   **Recommendation: defer it to its own stage**, and let search and filters land
   first — they are cheap and may reduce how much the density matters.
2. **Whether Delete stays visible at all on the Hives card.**
   **Recommendation: move it into the overflow menu.** It is irreversible, it is a
   hard delete, and Archive covers the ordinary "this hive is finished" case.
3. **Whether Archive should also appear on Records cards.** Records are individual
   observations rather than long-lived entities, and there is no archive concept for
   them in the schema. **Recommendation: no** — delete with a clear confirmation is
   the right model there.

## 9. Database Connections (MCP Server)

None. `archive_hive_cascade` already exists and is already called; this phase changes
only where it is reachable from. No schema, RLS policy, RPC or payload is altered.
