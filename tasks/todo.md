# Task: Foraging Hours — Research Tab
**Date:** 27/03/2026
**Status:** In Progress

## Objective
Add a new "Foraging Hours" tab to the Research section that displays historical foraging hours with year-over-year comparison, using accumulation and monthly bar charts (matching GDD Data styling).

## Plan

### 1. Explore & Plan
- [x] Explore codebase: existing foraging logic, GDD Data charts, Research page
- [x] Write feature plan in `docs/features/foraging-hours.md`

### 2. Create ForagingHoursTab Component
- [x] Create `src/components/research/ForagingHoursTab.tsx` with:
  - [x] Apiary selector (reuse GDD Data pattern)
  - [x] Year selector chips (current + 4 previous)
  - [x] Period filter (Q1-Q4, custom months)
  - [x] Chart type toggle (Accumulation / Monthly)
  - [x] Accumulation line chart (cumulative foraging hours per year)
  - [x] Monthly bar chart (total hours per month per year)
  - [x] Temperature overlay toggle (accumulation view)
  - [x] Current total reference line annotation

### 3. Integrate into Research Page
- [x] Add Foraging Hours tab to `src/app/dashboard/research/page.tsx`

### 4. Test
- [ ] Prompt user to test build

## Files Affected
- `src/components/research/ForagingHoursTab.tsx` (new)
- `src/app/dashboard/research/page.tsx` (modify)
- `docs/features/foraging-hours.md` (new)

## Review
_To be filled after implementation._
