# Double-Submit Guard (`useSubmitLock`)

**Status:** Added in batch 16, 19/10/2026 (Phase 2 fix batch 4).
**Checklist:** `tasks/security-batch16-todo.html`
**Findings:** C3-03, C7a-07, C7b-09, C7b-26, C6-07, C5b-12, C5b-14, C5a-10, C4-10, C4-11, C9a-18, C8b-01, C8b-02, C6-09, plus the CRM customer and invoice email Low items.

## Why

A state flag (`if (saving) return` / `disabled={saving}`) doesn't stop a double tap. Both taps can land before React re-renders, so both see `saving === false` and both write. Before this batch, most create/save handlers had no guard at all, and the rest relied on state. The results were duplicate hives, apiaries, queens, nucs, tasks, colonies, tickets, orders, customers and invitations. Duplicate traceability batches each used up a lot number and a trace code.

## The hook

`src/hooks/useSubmitLock.ts` returns `{ submitting, run }`.

- A **ref** is the lock. It changes immediately, so a second `run()` returns `undefined` without calling `fn`.
- `submitting` (state) is only for `disabled` and "Saving…" labels.
- The lock is released in `finally`, so an error or early return inside `fn` can't leave it stuck.
- `run` is stable (`useCallback([])`), so it's safe in other hooks' dependency lists.

## The pattern

```tsx
const { submitting, run } = useSubmitLock()

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault()          // ALWAYS outside run(): a locked second submit skips fn,
  void run(saveThing)         // and the browser would otherwise reload the page
}

const saveThing = async () => { /* the existing save code, unchanged */ }

<Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</Button>
```

- Where a component already had a `saving`/`sending` state, the hook replaces it under the same name (`const { submitting: saving, run } = useSubmitLock()`), so the JSX stays as it was.
- A component with two independent forms uses two hook instances, for example `MatingNucsTab` (single and bulk create).
- `fj-btn` buttons have no disabled style, so guarded buttons change their label ("Saving…", "Sending…", "Archiving…", "Generating…") to give visible feedback.

**Rule:** every new create or save button uses `useSubmitLock`.

## Where it's used

| Area | File |
|---|---|
| Hives | `components/hive/HiveFormSection.tsx` (both submit buttons) |
| Apiaries | `app/dashboard/apiaries/page.tsx` (also disabled while a photo uploads) |
| Wild colonies | `components/research/WildColoniesTab.tsx` (Confirm, Unconfirmed, Add/Update), `app/dashboard/submit-colony/page.tsx` |
| Diagnosis | `components/research/DiagnosisImagesTab.tsx` (comments; Enter used to bypass the disabled button), `components/tools/DiagnosisUploader.tsx` |
| Queens | `components/queens/QueenFormSection.tsx` |
| Rearing batches | `components/batches/BatchFormSection.tsx`; graft generation inside `hooks/useBatchGrafts.ts` (`generating`, held until the refreshed list is in) |
| Mating nucs | `components/batches/MatingNucsTab.tsx` (single and bulk create) |
| Distribution | `components/batches/DistributeGraftModal.tsx`, which replaced a hand-made ref lock that had no `finally` and stuck after an error |
| Records | Inspection, Varroa Treatment, Varroa Check, Feeding and Harvest forms (the lock sits in the form, which owns the button); the Archive form in `records/page.tsx` |
| Tasks | `app/dashboard/tasks/page.tsx` |
| Support | `app/dashboard/about/page.tsx` (live form), `app/dashboard/support/page.tsx` (orphan route) |
| Traceability | `components/tools/traceability/BatchesTab.tsx` |
| CRM | new customer, new order, send invoice email |
| Invitations | `app/dashboard/apiary-team/page.tsx` (the lock now also covers the shared-apiary check, which used to run with the button still enabled), `app/dashboard/rearing-team/page.tsx` |

## Per-row lock (Queen Tracker)

`QueenTrackerTab.tsx` saves one row at a time, per row, so it uses a `Set` rather than the hook. It used to copy state into a ref during render (`updatingIdsRef.current = updatingIds`). That never actually locked anything, and writing a ref during render breaks React's rules. Now the ref is the lock: the module-level helpers `lockRow(ref, setIds, id)` and `unlockRow(ref, setIds, id)` update the ref synchronously and mirror it into state for the disabled rows.

## Not covered (intentionally or later)

- Logbook save is an upsert, so a double save is harmless.
- The mating nuc bulk "change mating site" sets the same value twice, which is harmless. It keeps its state guard.
- CRM order detail actions use a `busy` flag that is state only. They were outside the audit items and are left for a later batch.
- Pending invitations need a unique index as a database backstop. *Done in batch 26 (23/10/2026): one pending invitation per team/group and `lower(email)`.*
