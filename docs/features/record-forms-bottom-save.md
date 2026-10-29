# Feature: Save Button at the Bottom of Record Forms

**Date:** 29 October 2026

## 1. Overview

On a phone, the Feeding, Varroa treatment, Varroa check and Harvest forms had their Save and Cancel buttons only in the header, above the fields. A beekeeper who filled the form in from top to bottom had to scroll all the way back up to save. The same Save and Cancel pair now also sits at the foot of each of these forms.

All four Save buttons are now green (`tone="success"`), per the batch-47 rule that saves are green and red is only for destructive actions. Previously Varroa treatment was red and Harvest and Varroa check were amber.

## 2. Scope & Simplicity

| Record | File | Change |
|---|---|---|
| Feeding | `src/components/records/forms/FeedingForm.tsx` | Bottom Save + Cancel |
| Varroa treatment | `src/components/records/forms/VarroaTreatmentForm.tsx` | Bottom Save + Cancel; Save red → green |
| Varroa check | `src/components/records/forms/VarroaCheckForm.tsx` | Bottom Save + Cancel (after the photo section); Save amber → green |
| Harvest | `src/components/records/forms/HarvestForm.tsx` | Bottom Save + Cancel; Save amber → green |
| Inspection | `InspectionForm.tsx` | None. Save is already at the bottom (review step). |
| Archive hive | `src/app/dashboard/records/page.tsx` | None. Archive is already at the bottom. |

## 3. Technical Design

### Architecture

Each form names its button group once as a local `actions` element and renders it twice:

- in the header row, where it always was;
- as the last child of the `<form>`, wrapped in `md:col-span-2` because the form is a two-column grid on wider screens.

Rendering one element twice means the label, colour, 48px height, saving state and Cancel handler can never differ between the top and bottom.

Both Save buttons submit the same form (`form="feeding-form"` etc.), so they run the same `handleSubmit`: the Varroa treatment hive and date checks, and the `useSubmitLock` ref lock. A tap on each button in quick succession still saves once. Cancel at the bottom is the same guarded Cancel (asks before discarding unsaved changes; Varroa check also clears the chosen photo).

The bottom buttons are in the page flow, not a fixed bar. A fixed bar would collide with Mel's button, toasts and banners near the bottom edge. The dashboard layout already pads the page foot for the mobile nav bar and Mel (`src/app/dashboard/layout.tsx`, `pb-[calc(var(--bottom-nav-inset)+4.5rem)]`), so the last button scrolls clear of both.

The same top-and-bottom pattern is used by the hive form (`src/components/hive/HiveFormSection.tsx`).

### Database Connections (MCP Server)

None. Client-side layout only.

## 4. Edge Cases & Risks

- **Double tap across both buttons:** blocked by the shared `useSubmitLock` ref lock.
- **Saving state:** both buttons read the same `submitting` flag, so both show "Saving..." and are disabled together.
- **Tests:** no test renders these four forms, so the duplicated button names break no `getByRole` lookups. A future test should use `getAllByRole` or scope to the form.

## 5. Implementation Phases

1. Extract `actions` and render it at the foot of each of the four forms; Save tone to `success`.
2. Type check and lint the four files.

Related: [record-form-dirty-state-plan.md](./record-form-dirty-state-plan.md) (unsaved-changes guard on the same four forms), [double-submit-guard.md](./double-submit-guard.md).
