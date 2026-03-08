# Plan: Add Manual Mating Location to App User Distributions

## Context
When distributing grafts to app users or group members, the only location option is the Recipient's Apiary dropdown. The "Other Beekeeper" mode has a free-text "Apiary / Mating Location (closest Eircode)" field. The user wants app user distributions to also have a manual mating location input as an alternative to the apiary dropdown, and requires at least one of the two to be filled before saving.

## Approach — Reuse `external_recipient_location` column
The `graft_distributions` table already has an `external_recipient_location` TEXT column, currently only populated for external recipients. We reuse it for app user distributions too — **no schema migration needed**.

## Changes

### 1. `src/components/batches/DistributeGraftModal.tsx`
- Add `matingLocation` state variable (string, default `''`)
- Reset it in `switchMode()` and `handleSelectUser()`
- Below the apiary dropdown, show "— or —" divider + a text input labelled "Mating Location (closest Eircode)" — only when **no apiary is selected**
- If an apiary **is** selected, hide the manual input (and clear `matingLocation`)
- Add `locationError` state (string). On submit, if neither `selectedApiaryId` nor `matingLocation.trim()` is filled, set error and return early
- Clear `locationError` when the user selects an apiary or types a location
- In save data: set `external_recipient_location: matingLocation.trim() || null` for non-external recipients (currently hardcoded to `null`)

### 2. `src/components/batches/DistributionList.tsx`
- For non-external recipients: also show `external_recipient_location` when present and no apiary name exists (as a "Location: ..." line, same style as external)

### 3. `docs/features/batch-distributions.md`
- Update modal field descriptions to document the new manual location input

## Files to Modify
- `src/components/batches/DistributeGraftModal.tsx`
- `src/components/batches/DistributionList.tsx`
- `docs/features/batch-distributions.md`

## Verification
- User tests distributing a graft to an app user with no apiary selected and no mating location — error message should appear
- User tests distributing with a manual mating location entered — saves successfully
- User tests distributing with an apiary selected — saves successfully, no location field shown
- Distribution list shows the manual location for the saved record
