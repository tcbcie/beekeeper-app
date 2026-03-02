# Reports Feature

## Overview

The Reports feature provides beekeepers with printable and exportable reports for compliance, monitoring, and record keeping.

## Access

- **Sidebar/Menu:** Click "Reports" in the navigation (between Tools and Research)
- **Direct URL:** Navigate to `/dashboard/reports`

## Available Reports

### 1. DAFM Varroa Treatment Report

**Purpose:** Irish Department of Agriculture, Food and the Marine compliance record for varroa treatments.

**Visual Design:**
- Official DAFM green branding (#006853)
- Irish language subtitle ("An Roinn Talmhaíochta, Bia agus Mara")
- Professional header with report generation date
- Beekeeper details and reporting period cards
- Summary statistics (total treatments, hives treated, products used, apiaries)
- DAFM logo included

**Fields included:**
- Treatment date
- Hive number
- Apiary name and Eircode
- Treatment product
- Batch number (for traceability)
- Dosage
- Application method

**Filters:**
- Apiary selection
- Time period (All time, 3 months, 6 months, 1 year, custom)

### 2. Varroa Monitoring Report

**Purpose:** Track mite levels and treatment effectiveness over time.

**Features:**
- Combined view of varroa checks and treatments
- Summary statistics:
  - Total checks performed
  - Total treatments applied
  - Average infestation rate
  - Threshold breaches count

**Filters:**
- Apiary and hive selection
- Time period

### 3. Hive Inspection Summary

**Purpose:** Review inspection history for a specific hive.

**Fields included:**
- Inspection date
- Queen seen/eggs present
- Brood pattern rating (visual indicator)
- Temperament rating (visual indicator)
- Population strength (visual indicator)
- Number of honey supers
- Notes

**Requirements:**
- Must select a specific hive to generate report

### 4. Apiary Overview

**Purpose:** Snapshot of all hives in an apiary.

**Features:**
- Current status of each hive
- Last inspection date
- Queen confirmation status
- Population strength ratings
- Summary counts (total, active, queen confirmed, never inspected)

**Requirements:**
- Must select a specific apiary to generate report

### 5. Harvest Report

**Purpose:** Track honey and wax production.

**Fields included:**
- Harvest date
- Hive number
- Honey weight (kg)
- Wax weight (kg)
- Frames harvested
- Floral source
- Notes

**Summary totals:**
- Total honey harvested
- Total wax harvested
- Total frames harvested
- Number of harvest events

### 6. Archived Hives Report

**Purpose:** Review hives that have been removed from active management.

**Fields included:**
- Archived date
- Hive number
- Apiary name
- Archive reason
- Notes

**Summary statistics:**
- Total archived hives
- Breakdown by archive reason (top 4 reasons)

**Filters:**
- Apiary selection
- Time period (filters by archive date)

**Use cases:**
- Track colony losses over time
- Analyse patterns in hive failures
- Review reasons for hive removals
- Compliance and audit records

### 7. Monthly Rearing Report

**Purpose:** Group-level summary of queen rearing activity for a selected month.

**Visibility:** Only shown to rearing group owners.

**Columns:**
- Member name
- Batches
- Grafts Accepted
- Queens Hatched
- Queens Mated
- Cells Distributed

**Sealed queen cell exclusion:** Distributed sealed queen cells (`distribution_type = 'queen_cell'` in `graft_distributions`) are subtracted from Queens Hatched and Queens Mated per batch, since there is no tracking of whether those cells hatched or queens mated. The count of distributed cells is shown in a separate "Cells Distributed" column.

**Filters:**
- Rearing group selection
- Month and year

### 8. NIHBS Monthly Returns

See [nihbs-monthly-returns.md](nihbs-monthly-returns.md) for full documentation.

**Purpose:** Formalised monthly returns for the NIHBS Conservation and Queen Rearing Group Scheme.

**Visibility:** Only shown to rearing group owners.

**Key feature:** The same sealed queen cell exclusion applies — distributed queen cells are subtracted from rows 13 (hatched) and 19 (mated within group) and tracked separately on row 28.

## Export Options

### CSV Export
Click "Export CSV" to download the current report data as a CSV file. The file will be named with the report type and current date (e.g., `dafm-varroa-treatments-2026-01-31.csv`).

### Print / PDF
Click "Print / PDF" to open the browser print dialog. From there you can:
- Print directly to a printer
- Save as PDF (select "Save as PDF" as the destination)

**Print optimisations:**
- Navigation and filter controls are hidden
- Text colours adjusted for readability on paper
- Summary statistics display with borders and dark text
- Tables formatted with clear borders
- Header retains DAFM green branding

## Related Features

### Batch Number in Treatment Form

The Varroa Treatment form now includes a "Batch Number" field for recording the product batch/lot number. This is required for DAFM compliance and appears in the DAFM Varroa Treatment Report.

**Location:** Records > New Record > Varroa Treatment > Batch Number field (after Dosage)

## Technical Details

### Database Changes
- Added `batch_number` VARCHAR(50) column to `varroa_treatments` table

### Navigation Updates
- Added "Reports" link to `Sidebar.tsx` (desktop)
- Added "Reports" link to `MobileDrawer.tsx` (mobile)

### File Structure
```
src/
├── app/dashboard/reports/
│   └── page.tsx                      # Main reports page
├── components/reports/
│   ├── index.ts                      # Barrel exports
│   ├── ReportFilters.tsx             # Date/location filters
│   ├── ReportExportBar.tsx           # Export buttons
│   ├── ReportTable.tsx               # Print-friendly table
│   ├── PrintableReport.tsx           # Print wrapper
│   ├── DAFMVarroaReport.tsx          # DAFM compliance (styled)
│   ├── VarroaMonitoringReport.tsx    # Mite tracking
│   ├── HiveInspectionSummary.tsx     # Inspection history
│   ├── ApiaryOverview.tsx            # Apiary snapshot
│   ├── HarvestReport.tsx             # Harvest tracking
│   └── ArchivedHivesReport.tsx       # Archived hives overview
├── components/records/forms/
│   └── VarroaTreatmentForm.tsx       # Updated with batch_number field
├── hooks/
│   ├── useReportsData.ts             # Report data fetching
│   ├── useRearingGroupReport.ts      # Monthly rearing report data
│   └── useNIHBSReport.ts             # NIHBS monthly returns data
└── types/
    ├── reports.ts                    # Report-specific types
    └── records.ts                    # Updated VarroaTreatment interface
```

### Print Styles
Print-specific CSS is included in `src/app/globals.css` with the `@media print` query:
- `.no-print` class hides elements when printing
- `.print-container` styles the main report area
- `.print-header` preserves header styling
- `.print-table` formats tables for paper
- `.print-date-box` ensures date box text is visible
- Summary cards converted to bordered boxes with dark text

### TypeScript Notes
- `ReportTable.tsx` exports a generic `Column<T>` interface for typed table columns
- Report components import the type as `ReportFiltersState` to avoid naming conflict with the `ReportFilters` component
- The `Column` type is also re-exported from `index.ts` for external use
