# Visit Checklist Redesign

## Overview

The Visit Checklist is a printable, per-apiary view that aggregates outstanding tasks and the equipment to bring. Previously, the entry point was hidden inside the filter card on `/dashboard/tasks` and only rendered once an apiary was selected from a dropdown — undiscoverable for new users and confusing for existing ones.

This redesign:

1. **Promotes the entry point.** A permanent **Visit Checklist** button now sits in the page header next to **Add Task/Event**, regardless of any filter state.
2. **Decouples the checklist from page filters.** When opened, the modal carries its own apiary picker and shows tasks scoped only by that picker (and active-status). Page-level filters (priority, type, ownership, etc.) no longer narrow the checklist — what you see is *"what is outstanding for this visit"*.
3. **Restructures the output.** Tasks are now grouped per hive within an apiary. When "All apiaries" is selected, an apiary heading frames each block. Tasks without a hive sit in a "General apiary tasks" group. The existing equipment-summary box keeps its place at the top, deduplicated across the chosen scope.

## Entry-point change

| Before | After |
|---|---|
| Button inside the filter card. Only visible when `filterApiary !== 'all'`. | Button always rendered in the page header, alongside **Add Task/Event**. |
| Apiary scope was always the active filter value. | Modal contains an explicit **Apiary** select (defaults to the current page filter if it's set, else "All apiaries"). |

## Output structure

The modal renders a header, an apiary picker, a deduplicated equipment box, then a *pair* of tables per apiary in scope (hive overview, then tasks), and a free-form notes panel at the bottom. Both tables are designed to print cleanly on portrait A4.

```
Visit Checklist — <apiary or "All apiaries"> — DD MMM YYYY

[ Apiary select ]                                  (hidden when printing)

📦 Equipment to bring
   ▢ applicator   ▢ frames   ▢ oxalic acid   ▢ super box

  Apiary A                                         (only when scope = "All apiaries")

  🐝 Hive overview
  ┌──────────┬──────────┬───────────────┬────────────┬──────┬────────────────────────────┐
  │ Hive     │ Status   │ Last inspected│ Queen seen │ Pop. │ Last notes                 │
  ├──────────┼──────────┼───────────────┼────────────┼──────┼────────────────────────────┤
  │ 12       │ active   │ 04/05/2026    │ Yes        │ 4    │ Normal inspection           │
  │ 4        │ queenless│ 02/05/2026    │ No         │ 1    │ Unite with 13               │
  └──────────┴──────────┴───────────────┴────────────┴──────┴────────────────────────────┘

  ✅ Tasks for this visit
  ┌────┬──────────┬──────────────────┬──────────────┬──────────┬──────────────────────┐
  │    │ Hive     │ Task             │ Due          │ Priority │ Equipment            │
  ├────┼──────────┼──────────────────┼──────────────┼──────────┼──────────────────────┤
  │ ▢  │ Hive 12  │ Treat varroa     │ 14/05/2026   │ HIGH     │ oxalic acid, …       │
  │ ▢  │ Hive 12  │ Add super        │ 21/05/2026   │ –        │ super box, frames    │
  │ ▢  │ General  │ Mow grass        │ 28/05/2026   │ –        │ –                    │
  └────┴──────────┴──────────────────┴──────────────┴──────────┴──────────────────────┘
```

The hive-overview columns mirror the `apiary-overview` report (`status`, `last_inspection_date`, `queen_seen`, `population_strength`, `notes` — sourced from each hive's most recent inspection). Beekeepers walking up to a hive get the latest known state alongside the visit's TODOs in one document.

Sorting:

- Apiaries: alphabetical by name. Tasks with no `apiary_id` go into a synthetic "Unassigned" group at the end.
- Hives within an apiary: numeric-aware locale sort on `hive_number`. The `null`-hive "General apiary tasks" group always comes last within its apiary.
- Tasks within a hive: ascending `start_date`.

Equipment list: split on commas and newlines from each task's `equipment_needed`, deduplicated, alphabetised.

## Hive context fetch

When the modal opens, a single side-effect (`useEffect` keyed on `showChecklist` + `checklistTasks`) issues two parallel queries:

1. `hives → id, status` for every hive that appears in `checklistTasks`.
2. `inspections → hive_id, inspection_date, queen_seen, population_strength, notes` ordered by `inspection_date` desc, restricted to those hive ids.

Results are reduced into a `Map<hive_id, HiveOverviewSummary>` — taking the first inspection per hive (the latest, given the descending order). The map is consumed by the overview table; missing inspections render as "Never" / "–". The fetch is cancellable via a closed-over flag so unmounting or switching scope mid-flight cannot leak stale state.

The fetch is **not** cached across modal opens — the user typically returns to the checklist after editing inspections, so refetching is the expected contract.

## Scope rules

A task is included in the checklist when:

- `completed === false`
- Either `checklistApiaryId === 'all'` *or* the task's `apiary_id === checklistApiaryId`

The modal **does not** apply the page-level filters (type, category, status, hive, ownership). This is intentional — the checklist's purpose is a complete picture of what's outstanding for the visit, not a print of the current filter view.

## Print behaviour

Print stylesheet is unchanged. The new apiary-picker `<select>` is hidden via `print:hidden`. Each apiary/hive section renders as headings + checkbox lists, which print cleanly.

## Files touched

- `src/app/dashboard/tasks/page.tsx`:
  - Removed `getSelectedApiaryName`; added `getChecklistScopeName` and `openChecklist` helpers.
  - Added `checklistApiaryId` state, `checklistTasks` / `checklistGroups` derivations (`useMemo`), and `hiveOverview` / `loadingOverview` state for the per-hive context fetch.
  - Moved the Visit Checklist trigger from inside the filter card to the page header.
  - Replaced the modal's flat task list with two polished tables per apiary group: hive overview (mirroring `apiary-overview` report columns) and a tasks table with checkbox, hive, task, due date, priority, equipment.
  - Widened the modal Card from `max-w-lg` to `max-w-4xl` to fit the table layout comfortably; tables wrap in `overflow-x-auto` for narrow viewports.
  - Print styles: every cell uses `print:border-black`, alternating row backgrounds drop in print (`print:even:bg-transparent`), the apiary picker is hidden, and each apiary section has `print:break-inside-avoid` so a single apiary's overview + tasks stay together on the page.

No DB migration. No new components. The existing `Surface`, `CheckboxInput`, `Badge`, `SelectField`, and `FieldLabel` primitives are reused.

## Out of scope

- No save/export of the checklist as a record. It is generated from current state on every open.
- No reordering UI for hives within an apiary (always alphanumeric).
- No multi-select of apiaries. The picker is single-value: one apiary or "All apiaries".
- No grouping by date. Within a hive, tasks are still listed chronologically rather than grouped into "today / this week / later".

## Print fix (06 Jun 2026)

**Issue reported:** Printing the checklist produced a first page cut in half, then the same list repeated across ~15 pages.

**Root cause:** The modal overlay is `position: fixed` (`fixed inset-0`). The previous `print:` utilities only changed background/padding, leaving the element fixed. Chrome anchors a fixed element to every printed page and clips it to viewport height — producing the repeated, half-cut output.

**Fix (minimal, 3 changes):**
- `src/app/dashboard/tasks/page.tsx` — overlay gains `checklist-print-overlay` marker class plus `print:static print:block`, so it leaves fixed positioning and flows normally when printing.
- `src/app/dashboard/tasks/page.tsx` — modal `Card` gains `print:overflow-visible` so content paginates instead of being clipped by `overflow-y-auto`.
- `src/app/globals.css` (`@media print`) — `*:has(> .checklist-print-overlay) > *:not(.checklist-print-overlay) { display: none }` hides the dashboard list behind the modal so only the checklist prints.
