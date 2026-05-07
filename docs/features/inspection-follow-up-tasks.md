# Inspection Follow-Up Tasks

## Overview

At the end of an inspection record, the beekeeper can optionally capture a list of follow-up tasks for the next visit to that hive — what to do, when, and what equipment / consumables to bring. On save, each task becomes a row in `tasks_events`, automatically scoped to the inspection's hive and apiary.

This closes the gap between recording an observation and creating the corresponding TODO without leaving the inspection flow. The tasks then surface in `/dashboard/tasks` and in the per-apiary Visit Checklist (see `visit-checklist-redesign.md`).

## UI

A new collapsible section, **Next Visit Plan**, is rendered in the inspection form between the Notes and Photo sections. The section description reads: *"Optional. Each task is added to your Tasks list, linked to this hive."*

Inside the collapsible:

- Each follow-up task is a card row with: **Title** (required), **Due date**, **Priority** (low / normal / high / urgent), **Equipment / consumables to bring** (free text, comma-separated), **Notes**.
- An **Add task** button appends a new draft. Default due date for the first row is the inspection date plus 14 days; subsequent rows reuse the previous row's date.
- Each row has a **Remove** button.
- The collapsible is closed by default; the header shows a count chip when drafts exist (`(2 tasks ready)`).

When the inspection is saved, drafts with an empty title are silently dropped. Title is the only required field.

## Data model

**No DB migration.** The existing `tasks_events` table is reused as-is. Each draft becomes one row with:

| Column | Source |
|---|---|
| `user_id` | current user |
| `title` | draft title (trimmed) |
| `description` | draft notes (trimmed; `null` if empty) |
| `event_type` | `'task'` |
| `category` | `'inspection'` |
| `priority` | draft priority |
| `start_date` | draft due date |
| `all_day` | `true` |
| `hive_id` | the inspection's `hive_id` |
| `apiary_id` | resolved from the hive's `apiary_id` |
| `equipment_needed` | draft equipment (trimmed; `null` if empty) |
| `notes` | `Auto-created from inspection on YYYY-MM-DD.` |
| `is_team_task` | `true` if the hive is in the user's `sharedHiveIds` set |
| `completed` | `false` |

The draft itself is **not** persisted on the inspection. It lives only as transient state in the inspection form, surfaced to the records page via a third argument to the form's `onSubmit` callback.

## Edit / Delete semantics — tasks are independent

Once created, follow-up tasks are decoupled from the originating inspection:

- **Editing the inspection** does not modify, recreate, or delete its previously-created tasks. The tasks may already be completed or hand-edited in the tasks page; treating them as inspection-owned would risk destroying user work.
- **Deleting the inspection** does not delete its tasks.
- **Re-opening an inspection for editing** shows an empty Next Visit Plan section. Adding rows on edit creates *new* tasks; old ones stay untouched.

This is deliberately asymmetric with the honey-supers auto-sync (which reverses on edit/delete). The reasoning is that hive configuration is a numeric mirror of an inspection event, while tasks are owned by their lifecycle in the tasks page.

## Failure mode

The inspection write is the source of truth. Task creation is best-effort:

- If `tasks_events.insert(rows)` fails (RLS, network, anything), the inspection is still saved and a single warning toast appears: *"Inspection saved, but N follow-up task(s) could not be created. Open Tasks to add them manually."*
- No partial rollback. The user has the task drafts in their head from filling them in seconds ago and can retype them on the tasks page.

## Files touched

- `src/types/records.ts` — added `FollowUpTaskDraft`, `FollowUpTaskPriority`, `getDefaultFollowUpTaskDraft`. `Inspection` and `InspectionFormData` are unchanged.
- `src/components/records/forms/InspectionForm.tsx` — extended `onSubmit` signature with a third `followUpTasks` argument; added `followUpDrafts` state, reset wiring, and the Next Visit Plan collapsible.
- `src/app/dashboard/records/page.tsx` — `handleInspectionSubmit` accepts `followUpTasks` and inserts them as `tasks_events` rows after the inspection write succeeds.

## Out of scope

- No backfill from historical inspections.
- No two-way binding (changing a task in the tasks page does not reflect on the inspection).
- No reminder-email defaults — `reminder_enabled` is left `false`; users opt in per task via the tasks page.
- The `category` of auto-created tasks is hard-coded to `'inspection'`. A per-row picker can be added later if requested.
