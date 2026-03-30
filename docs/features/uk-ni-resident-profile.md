# UK/NI Resident Profile Setting

## Overview

Users in Northern Ireland or the UK can toggle a "Resident in NI/UK" setting on their profile. This controls two behaviours:

1. **Currency** — Profit/Loss tracker displays amounts in GBP (£) instead of EUR (€)
2. **Varroa treatments** — The treatment recording form pre-filters to show only UK-approved products (with an option to show all)

## Database Changes

### `profiles` table
- Added `is_uk_ni_resident boolean NOT NULL DEFAULT false`

### `varroa_treatment_products` table
- Added `approved_in_ireland boolean NOT NULL DEFAULT true` (existing treatments default to Irish-approved)
- Added `approved_in_uk boolean NOT NULL DEFAULT false`
- Added unique constraint on `product_name`
- Seeded/flagged 14 UK-approved treatments from the approved list
- 6 UK-only treatments (Thymovar, Oxuvar, Apistan, Apitraz, Bayvarol, Polyvar Yellow) set to `approved_in_ireland = false`

## UI Changes

### Profile Page (`src/app/dashboard/profile/page.tsx`)
- "Location" section between Mobile Number and Association Membership
- Checkbox toggle: "I am a resident of Northern Ireland or the UK"
- Shown in read-only view when enabled

### Profit/Loss (`src/components/tools/ProfitLoss/`)
- `index.tsx` fetches `is_uk_ni_resident` from the user's profile
- `FinancialSummary.tsx` and `FinancialRecordCard.tsx` accept `isUkNi` prop
- Currency formatting switches between `en-GB`/`GBP` and `en-IE`/`EUR`

### Treatment Management (`src/components/settings/TreatmentManagement.tsx`)
- "Approved in Ireland" and "Approved in UK/NI" checkboxes in the add/edit form
- "Approved In" column with IE/UK badges in the treatments table
- All/Ireland/UK region filter buttons to filter the table
- Description updated to reference both Ireland and UK

### Varroa Treatment Form (`src/components/records/forms/VarroaTreatmentForm.tsx`)
- Accepts `isUkNiResident` prop
- When true, pre-filters treatment product dropdown to UK-approved products only
- "Show all products" checkbox allows users to see the full list

### Records Data Hook (`src/hooks/useRecordsData.ts`)
- Fetches `is_uk_ni_resident` from profiles alongside other data
- Exposes `isUkNiResident` boolean for consumer components

### Types (`src/types/records.ts`)
- Added `approved_in_uk: boolean` to `TreatmentProduct` interface

## UK-Approved Treatments

The following products are flagged as UK-approved:

| Product | Active Ingredient |
|---------|------------------|
| Apiguard | Thymol |
| ApiLife Var | Thymol, Eucalyptus, Menthol, Camphor |
| Thymovar | Thymol |
| Formic Pro | Formic Acid |
| Apibioxal | Oxalic Acid |
| Bienenwohl | Oxalic Acid |
| Oxuvar | Oxalic Acid |
| Oxybee | Oxalic Acid |
| VarroMed | Oxalic Acid, Formic Acid |
| Apistan | Tau-fluvalinate |
| Apitraz | Amitraz |
| Apivar | Amitraz |
| Bayvarol | Flumethrin |
| Polyvar Yellow | Flumethrin |
