# Distribution — External (Non-App) Recipient Support

## Plan

### 1. DB migration
- [x] 1a. Make `recipient_user_id` nullable (currently `NOT NULL`)
- [x] 1b. Add `external_recipient_name TEXT NULL`
- [x] 1c. Add `external_recipient_email TEXT NULL`
- [x] 1d. Add `external_recipient_phone TEXT NULL`
- [x] 1e. Add `external_recipient_location TEXT NULL` (Eircode / apiary description)

### 2. `src/hooks/useGraftDistributions.ts`
- [x] 2a. Add 4 new external fields to `GraftDistribution` interface; make `recipient_user_id` `string | null`
- [x] 2b. Add 4 new external fields to `CreateDistributionData` and `BulkDistributionData`; make `recipient_user_id` optional (`string | null`)
- [x] 2c. New columns auto-included via `*` — no query change needed
- [x] 2d. Map the 4 new columns in the data transform; update bulk row builder

### 3. `src/components/batches/DistributeGraftModal.tsx`
- [x] 3a. Replace `groupOnly` boolean with `recipientMode: 'group' | 'app_user' | 'external'` state
- [x] 3b. Three toggle buttons: Group Member / App User / Other Beekeeper
- [x] 3c. External form: Name, Email, Mobile, Apiary/Mating Location (closest Eircode)
- [x] 3d. Submit enabled when external mode has at least one field filled
- [x] 3e. `handleSubmit` builds correct shape for each mode
- [x] 3f. `switchMode` helper resets all mode-specific state on toggle

### 4. `src/components/batches/BatchGraftsSection.tsx`
- [x] 4. Distribution card: `isExternal` flag drives display — external name/email/phone/location shown instead of app user joined fields

### 5. Update docs
- [x] 5. Updated `docs/features/batch-distributions.md` — schema table and modal section

---

## Review

### Summary of Changes

**DB migration (`add_external_recipient_fields`):**
- `recipient_user_id` made nullable — existing records unaffected
- 4 new nullable TEXT columns: `external_recipient_name`, `external_recipient_email`, `external_recipient_phone`, `external_recipient_location`

**`src/hooks/useGraftDistributions.ts`:**
- `GraftDistribution`, `CreateDistributionData`, `BulkDistributionData` interfaces updated — `recipient_user_id` now `string | null`, 4 external fields added
- Mapping includes 4 new columns (auto-fetched by existing `*` select)
- Bulk row builder passes external fields through

**`src/components/batches/DistributeGraftModal.tsx`:**
- `groupOnly` boolean replaced with `recipientMode: 'group' | 'app_user' | 'external'`
- Three segmented toggle buttons at the top of the recipient section
- External mode shows: Name, Email, Mobile, Apiary/Mating Location (closest Eircode)
- Submit enabled when at least one external field is non-empty
- `switchMode()` helper resets all state on toggle

**`src/components/batches/BatchGraftsSection.tsx`:**
- `isExternal = !dist.recipient_user_id` flag drives the card display
- External: shows name/email, phone on tertiary line, location labelled "Location: ..."
- App user: existing geo-labelled display unchanged

**`docs/features/batch-distributions.md`:** Schema table and modal section updated.
