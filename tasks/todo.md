# Auto-populate "Days" field in Varroa Check form

## Context
When creating a new varroa check with "Natural Mite Drop" or "Screening Board" method, the `sample_size` field displays as "Days". The user wants this field auto-populated with the number of days since the last varroa check for the selected hive. The field must remain editable.

## Plan

- [x] **1. Pass `varroaChecks` to `VarroaCheckForm`** — Add a new prop `existingChecks` to the form component. Pass the existing `varroaChecks` array from the records page.

- [x] **2. Add auto-populate logic in `VarroaCheckForm`** — When a hive is selected (new check only, not editing), find the most recent varroa check for that hive **with the same method**, calculate the day difference between the current check date and the last check date, and set it as the `sample_size` value. Only auto-populate when `isNaturalDrop` is true and the user hasn't manually edited the field yet.

## Files to change
- `src/components/records/forms/VarroaCheckForm.tsx` — Add prop, add useEffect for auto-populate
- `src/app/dashboard/records/page.tsx` — Pass `varroaChecks` to the form

---

## Review

### Changes Made
- **`VarroaCheckForm.tsx`** — Added `existingChecks` prop. Added a `useEffect` that triggers on hive/method/date change. For new checks only, it finds the last varroa check for the same hive **with the same method**, calculates the day difference, and pre-fills the Days (`sample_size`) field. The field remains fully editable.
- **`records/page.tsx`** — Passed the existing `varroaChecks` array to the form component.

### Impact
- 2 files changed, ~15 lines added
- 0 new files, 0 breaking changes
- Only affects new varroa checks with Natural Mite Drop / Screening Board method
