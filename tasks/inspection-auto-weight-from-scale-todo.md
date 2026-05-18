# Auto-populate inspection weight from connected scale

## Goal

When the inspection form opens for a hive that is connected to a scale (BEEP or Wolf Waagen), pre-fill the **Weight (kg)** field with the scale's current weight. The user can still edit/override before saving.

## Existing infrastructure (already in place)

- Hive ↔ scale link columns on `hives`: `beep_device_id`, `wolf_scale_id`.
- API routes:
  - `GET /api/beep/data?deviceId=…&hiveId=…` → returns `lastValues.weight_kg_corrected ?? lastValues.weight_kg`.
  - `GET /api/wolf-waagen/data?scaleId=…&hiveId=…` → returns `lastValues.weight_kg`.
- Form: `src/components/records/forms/InspectionForm.tsx` — weight field at lines 833-843.
- Hive type used by the form: `src/types/records.ts` `Hive` (does **not** yet include the two scale-id columns; the data is fetched via `.select('*')` so the columns are present at runtime).

## Approach

1. **Types** — add `beep_device_id?: string | null` and `wolf_scale_id?: string | null` to `Hive` in `src/types/records.ts`.
2. **InspectionForm** — add an effect that fires when the selected hive changes:
   - Skip if `isEditing` is true (don't overwrite historical inspections).
   - Skip if `formData.weight` already has a value (don't clobber user input).
   - Look up the hive by `selectedHiveId` in the `hives` prop. If neither `beep_device_id` nor `wolf_scale_id` is set, do nothing.
   - Get the user's auth token via `supabase.auth.getSession()`.
   - Call the relevant `/api/…/data` route with an `AbortController` so a hive change or unmount cancels the in-flight request.
   - On success, parse the weight from `lastValues` and `setFormData(prev => ({ …prev, weight: kg }))`.
   - Track the last hive id fetched in a `useRef` to avoid re-fetch loops on form state changes.
   - Render a small "Auto-filled from scale" hint under the input when the value came from the scale; clear the hint if the user edits the value.
3. **Behaviour on errors** — silent fall-through to manual entry. Console-error for diagnostics; no toast (the field is optional, failing to auto-fill is not a user-visible failure).
4. **Precedence when both scales connected** — prefer `wolf_scale_id` first, then `beep_device_id`. (Vanishingly rare to have both on one hive; deterministic precedence avoids surprise.)
5. **Docs** — add a short paragraph to `docs/features/beep-scale.md` and `docs/features/wolf-waagen.md` cross-referencing this auto-fill behaviour.

## Files to touch

- `src/types/records.ts` (add two fields)
- `src/components/records/forms/InspectionForm.tsx` (effect + small hint)
- `docs/features/beep-scale.md` (one paragraph)
- `docs/features/wolf-waagen.md` (one paragraph)

## Out of scope

- Storing the source (manual vs scale) in the DB. The pre-fill is invisible to history.
- Auto-fill in the wild-colonies inspection panel or batch nuc inspection panel. Those forms don't currently have a weight field; adding it is a separate piece.
- Backfilling weight on existing inspection records.

## Todos

- [x] **1.** Types — `beep_device_id` and `wolf_scale_id` added to `Hive` in `src/types/records.ts`.
- [x] **2.** Inspection form — effect added: triggers on hive change in create mode only, skips when `formData.weight` is already set, AbortController-cancels in-flight fetches on hive change / unmount / hive deselect.
- [x] **3.** "Auto-filled from BEEP/Wolf Waagen scale" hint under the weight input; clears on user edit.
- [x] **4.** Doc note in `docs/features/beep-scale.md` and `docs/features/wolf-waagen.md`.
- [ ] **5.** User verification — see "Please verify" below.

## Review

### What changed

- **Types** — `src/types/records.ts`: added `beep_device_id?: string | null` and `wolf_scale_id?: string | null` to `Hive`. Data is already fetched (the parent uses `.select('*')`), so no query change was needed.
- **Inspection form** — `src/components/records/forms/InspectionForm.tsx`:
  - New refs `lastScalePrefillHiveIdRef` (loop guard) and `scaleFetchAbortRef` (in-flight controller).
  - New state `weightFromScale` (`{ kg, source: 'beep' | 'wolf' } | null`) to drive the inline hint.
  - New effect keyed on `formData.hive_id`: in non-edit mode, when the user has not already supplied a weight and the hive has a `wolf_scale_id` or `beep_device_id`, fetch the relevant `/api/{wolf-waagen,beep}/data?…` endpoint with the user's auth token and pre-fill `formData.weight`. Late responses are dropped via `AbortController`. Errors are swallowed (manual entry remains).
  - Unmount cleanup aborts any pending fetch.
  - The `onChange` of the weight input clears `weightFromScale` when the user edits to a different value, so the "Auto-filled" hint disappears once the value is no longer the scale's.
  - Precedence: Wolf first, then BEEP. Deterministic for the rare case where both are linked on one hive.
- **Docs** — short paragraph added to `docs/features/beep-scale.md` and `docs/features/wolf-waagen.md` describing the auto-fill rule.

### Behaviour

- New inspection on a Wolf-linked hive with no typed weight → field pre-fills with the scale's `weight_kg`. Subscript reads "Auto-filled from Wolf Waagen scale".
- New inspection on a BEEP-linked hive → pre-fills with `weight_kg_corrected ?? weight_kg`. Subscript reads "Auto-filled from BEEP scale".
- Hive has no scale → no fetch, no hint, manual entry unchanged.
- User edits the value → hint clears.
- Editing an existing inspection → no auto-fill (historical accuracy preserved).
- Scale API errors out / times out / returns 4xx → silent, manual entry unchanged.
- User switches hives mid-fetch → previous request aborted; new hive triggers a fresh fetch.

### Files touched

- `src/types/records.ts`
- `src/components/records/forms/InspectionForm.tsx`
- `docs/features/beep-scale.md`
- `docs/features/wolf-waagen.md`

### Please verify

1. Open the **New Inspection** form for a hive with a connected scale → weight should pre-fill and show the small "Auto-filled from … scale" hint.
2. Type over the auto-filled value → hint should disappear, manual value should remain.
3. Open the form for a hive **without** a scale → no auto-fill, no hint, behaves as before.
4. Open an existing inspection in **Edit** mode → weight stays as recorded; no auto-fill.
5. Start a new inspection, switch the hive selection mid-form → the new hive's scale weight should replace the field (provided you haven't typed); switching to a no-scale hive should leave the value alone (the effect runs once per hive selection).
