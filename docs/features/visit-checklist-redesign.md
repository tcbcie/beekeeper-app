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

```
Visit Checklist — <apiary or "All apiaries"> — DD MMM YYYY

[ Apiary select ]   (hidden when printing)

📦 Equipment to bring
  ▢ applicator
  ▢ frames
  ▢ oxalic acid
  ▢ super box

✅ Tasks to complete
  Apiary A   (only shown when scope = "All apiaries")
    Hive 12
      ▢ Treat varroa     2026-05-14   HIGH
        Equipment: oxalic acid, applicator
      ▢ Add super        2026-05-21
        Equipment: super box, frames
    General apiary tasks
      ▢ Mow grass        2026-05-28

  Apiary B
    Hive 4
      ...
```

Sorting:

- Apiaries: alphabetical by name. Tasks with no `apiary_id` go into a synthetic "Unassigned" group at the end.
- Hives within an apiary: numeric-aware locale sort on `hive_number`. The `null`-hive "General apiary tasks" group always comes last within its apiary.
- Tasks within a hive: ascending `start_date`.

Equipment list: split on commas and newlines from each task's `equipment_needed`, deduplicated, alphabetised.

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
  - Added `checklistApiaryId` state and `checklistTasks` / `checklistGroups` derivations (`useMemo`).
  - Moved the Visit Checklist trigger from inside the filter card to the page header.
  - Replaced the modal's flat task list with the apiary → hive grouped output. The equipment block now reads from `checklistTasks` instead of `filteredTasks`.

No DB migration. No new components. The existing `Surface`, `CheckboxInput`, `Badge`, `SelectField`, and `FieldLabel` primitives are reused.

## Out of scope

- No save/export of the checklist as a record. It is generated from current state on every open.
- No reordering UI for hives within an apiary (always alphanumeric).
- No multi-select of apiaries. The picker is single-value: one apiary or "All apiaries".
- No grouping by date. Within a hive, tasks are still listed chronologically rather than grouped into "today / this week / later".
