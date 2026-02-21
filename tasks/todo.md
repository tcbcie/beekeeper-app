# NIHBS Monthly Excel Export — Match Official Template

## Problem
The monthly sheet in the NIHBS Excel export didn't match the official NIHBS template. The current output was a simple table with minimal formatting, but the template has specific formatting, layout, section headers, and styling.

## Plan

### Monthly Sheet Layout Changes
- [x] **1. Add Group Name row** — Row 1: "Group Name" label + group name with red background
- [x] **2. Add "Data Checks" header** — Red-background header block with white text in row 3
- [x] **3. Add "Breakdown of quantities..." header** — Rich text with YELLOW highlighted, merged across columns
- [x] **4. Add #1–#20 numbered column headers** — Show all 20 apiary slots with grey fill for unused
- [x] **5. Add rotated apiary names** — Apiary names at 45° angle, N/A with grey for unused slots
- [x] **6. Use full metric labels** — Matched the template's longer, more descriptive labels
- [x] **7. Add yellow highlighting** — Yellow fill on all data value cells (Total + per-apiary)
- [x] **8. Add grey fill for unused columns** — Grey out N/A apiary columns in data rows
- [x] **9. Add "Within your group" section header** — Before queens mated and hybridised rows
- [x] **10. Add "Outside your group" section header** — Before virgin queens distributed rows
- [x] **11. Add per-apiary breakdown for queens mated** — Yellow cells for each apiary column
- [x] **12. Add note about hatching** — Red bold italic note below queen cells hatched row
- [x] **13. Add explanatory notes** — Hybridised offspring note + NB note for virgin queens

### Documentation
- [x] **14. Update docs/features/nihbs-monthly-returns.md** — Documented the new monthly sheet layout

## Review

### Summary
Reworked the monthly sheet generation in the NIHBS Excel export to closely match the official NIHBS template. All changes were confined to the Excel export code — no data logic changes, no UI changes, no database changes.

### Key Changes
- Monthly sheets now have 22 columns (Label + Total + 20 apiary slots) instead of dynamic columns
- Added proper header section with Group Name (red bg), Data Checks box (red bg, white text), breakdown instructions with rich text
- All 20 apiary slots shown with numbered headers, rotated names, and N/A/grey for unused
- Data cells use yellow fill for values, grey fill for unused apiary columns
- Added "Within your group" and "Outside your group" section headers
- Added hatching note in red bold italic matching template
- Added explanatory notes alongside hybridised offspring and virgin queens rows
- Updated metric labels to match template exactly

### Files Changed

| File | Change |
|------|--------|
| `src/components/rearing-groups/NIHBSMonthlyReturn.tsx` | Replaced monthly sheet Excel generation with template-matching layout |
| `docs/features/nihbs-monthly-returns.md` | Updated monthly sheet documentation |
