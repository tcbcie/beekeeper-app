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
- DAFM logo support (optional)

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

**Adding the DAFM Logo:**
To display the official DAFM logo on the report:
1. Obtain the logo from [agriculture.gov.ie](https://www.agriculture.gov.ie/) or [gov.ie](https://www.gov.ie/en/organisation/department-of-agriculture-food-and-the-marine/)
2. Save the image as `dafm-logo.png`
3. Place it in the `/public` folder
4. The logo will automatically appear in the report header

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
│   └── HarvestReport.tsx             # Harvest tracking
├── components/records/forms/
│   └── VarroaTreatmentForm.tsx       # Updated with batch_number field
├── hooks/
│   └── useReportsData.ts             # Report data fetching
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
- Summary cards converted to bordered boxes with dark text
