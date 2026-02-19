# Conservation Areas Feature — Todo

## Tasks

- [x] Task 1: Database migration — `conservation_areas` table, RLS, seed data
- [x] Task 2: `src/types/apiary.ts` — Add `is_conservation_area`, `ca_radius_km` fields
- [x] Task 3: `src/app/dashboard/apiaries/page.tsx` — CA checkbox UI, save/load logic
- [x] Task 4: `src/components/admin/ConservationAreaManager.tsx` — New admin component
- [x] Task 5: `src/app/dashboard/settings/page.tsx` — Add CA Manager tab for Power Users & Admins
- [x] Task 6: `src/app/dashboard/community-map/page.tsx` — Fetch CAs, render layer, toggle, legend
- [x] Task 7: `docs/features/conservation-areas.md` — Feature documentation

## QA Audit Fixes

- [x] P0: Add partial unique index on `apiary_id` (WHERE NOT NULL) — upsert was always failing
- [x] P1: Add error handling on CA upsert and delete in apiary save
- [x] P1: XSS — add `escapeHtml()` to all CA popup interpolations, validate `nihbs_url` is https
- [x] P2: Fix `is_uk_ni` in `handleEdit` — now reads actual value from apiary record
- [x] P2: Add `is_uk_ni` to `Apiary` interface
- [x] P2: Add `updated_at` trigger on `conservation_areas`
- [x] P2: Fix sections filter — CA tab set to `adminOnly: true, powerUserAllowed: true`
- [x] P3: Update access denied message for Power Users
- [x] P3: Remove unused `apiaryId` parameter from `typeBadge`
- [x] P3: Fix marker icon to leaf SVG per spec

## Review

### Implementation Changes

1. **Database** — Created `conservation_areas` table with RLS policies and 8 seed CAs from the known NIHBS 2022 list.

2. **Types** (`src/types/apiary.ts`) — Added `is_conservation_area: boolean` and `ca_radius_km: string` to `ApiaryFormData`. Added `is_uk_ni?: boolean` to `Apiary` interface.

3. **Apiary Form** (`src/app/dashboard/apiaries/page.tsx`):
   - Added `is_conservation_area: false, ca_radius_km: '1'` to default form state and `resetForm`.
   - Updated `handleEdit` to async — queries `conservation_areas` for existing CA record and pre-fills checkbox/radius. Now also reads `is_uk_ni` from the apiary.
   - Updated save logic to upsert/delete the CA record after the apiary upsert, with proper error handling.
   - Added CA checkbox UI (teal box) after the share-location block — only visible when sharing is enabled. Auto-unchecks CA if sharing is turned off.

4. **ConservationAreaManager** (`src/components/admin/ConservationAreaManager.tsx`) — New admin component following the existing manager pattern. Lists all CAs in a table; land-type CAs are editable/deletable; apiary-linked ones are shown as read-only.

5. **Settings Page** (`src/app/dashboard/settings/page.tsx`):
   - Access gate changed from admin-only to power-user-or-admin.
   - CA tab correctly gated to Power Users and Admins via `adminOnly: true, powerUserAllowed: true`.
   - Updated access denied message.

6. **Community Map** (`src/app/dashboard/community-map/page.tsx`):
   - Added `escapeHtml()` utility for XSS prevention in popups.
   - Added `nihbs_url` validation (must start with `https://`).
   - Renders teal dashed radius circles and leaf-icon markers with sanitised popups.

7. **Documentation** (`docs/features/conservation-areas.md`) — Full feature docs.

### QA Audit Database Fixes

- Partial unique index: `conservation_areas_apiary_id_key ON conservation_areas (apiary_id) WHERE apiary_id IS NOT NULL`
- Trigger: `set_conservation_areas_updated_at BEFORE UPDATE` using `update_updated_at_column()`
