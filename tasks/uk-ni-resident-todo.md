# Resident in NI/UK Profile Setting - Implementation Todo

**Date:** 29/03/2026
**Status:** Complete

- [x] 1. Migration: add `is_uk_ni_resident` to profiles
- [x] 2. Migration: add `approved_in_uk` to varroa_treatment_products + seed UK treatments
- [x] 3. Profile page: add toggle and wire up save/fetch
- [x] 4. Profit/Loss: fetch flag and pass to components
- [x] 5. FinancialSummary + FinancialRecordCard: dynamic currency
- [x] 6. TreatmentManagement: add `approved_in_uk` to form and display
- [x] 7. types/records.ts: add `approved_in_uk` to TreatmentProduct
- [x] 8. useRecordsData: fetch `is_uk_ni_resident` and expose
- [x] 9. VarroaTreatmentForm: pre-filter for UK residents
- [x] 10. Documentation

## Review

### Summary of Changes

**Database (via Supabase MCP migrations):**
- Added `is_uk_ni_resident` boolean column to `profiles` table (default false)
- Added `approved_in_uk` boolean column to `varroa_treatment_products` table (default false)
- Added unique constraint on `product_name`
- Flagged 8 existing products as UK-approved and inserted 6 new UK-only treatments

**Profile Page (`src/app/dashboard/profile/page.tsx`):**
- Added "Location" section with NI/UK resident checkbox
- Wired up to fetch, save, cancel, and read-only display

**Profit/Loss (`src/components/tools/ProfitLoss/`):**
- `index.tsx` fetches `is_uk_ni_resident` and passes `isUkNi` prop
- `FinancialSummary.tsx` and `FinancialRecordCard.tsx` switch between GBP/EUR formatting

**Treatment Management (`src/components/settings/TreatmentManagement.tsx`):**
- Added `approved_in_uk` to interfaces, emptyFormData, and handleEdit
- Added UK Approved checkbox in add/edit form
- Added UK Approved badge column in table display
- Updated description text to reference Ireland and UK

**Records (`src/types/records.ts`, `src/hooks/useRecordsData.ts`, `src/app/dashboard/records/page.tsx`):**
- Added `approved_in_uk` to `TreatmentProduct` interface
- `useRecordsData` fetches and exposes `isUkNiResident`
- Records page passes `isUkNiResident` to `VarroaTreatmentForm`

**Varroa Treatment Form (`src/components/records/forms/VarroaTreatmentForm.tsx`):**
- Accepts `isUkNiResident` prop
- Pre-filters treatment products to UK-approved when flag is on
- "Show all products" toggle lets users override the filter

**Documentation:**
- Created `docs/features/uk-ni-resident-profile.md`

### Files Modified
1. `src/app/dashboard/profile/page.tsx`
2. `src/components/tools/ProfitLoss/index.tsx`
3. `src/components/tools/ProfitLoss/FinancialSummary.tsx`
4. `src/components/tools/ProfitLoss/FinancialRecordCard.tsx`
5. `src/components/settings/TreatmentManagement.tsx`
6. `src/types/records.ts`
7. `src/hooks/useRecordsData.ts`
8. `src/app/dashboard/records/page.tsx`
9. `src/components/records/forms/VarroaTreatmentForm.tsx`
10. `docs/features/uk-ni-resident-profile.md` (new)
