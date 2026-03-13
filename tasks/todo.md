# Queen Cell Status for Distributed Cells

**Date:** 2026-03-13

## Tasks

- [x] 1. DB Migration — Add `mated_date` column to queens table
- [x] 2. Distribution Hook — Set `'cell'` status for queen cell distributions
- [x] 3. Queen Type — Add `mated_date` to Queen interface
- [x] 4. Queens List Page — Badge, filter, form updates
- [x] 5. Queen Detail Page — Cell banner + Mark Mated/Failed actions
- [x] 6. Hive Queen Dropdown — Include cell queens with "(Cell)" label
- [x] 7. Code Audit — Hardened all findings

## Review

### Changes Summary

| File | Change |
|------|--------|
| DB migration | Added `mated_date date` column to `queens` table |
| `src/types/queen.ts` | Added `mated_date` to `Queen` and `QueenFormData` interfaces |
| `src/hooks/useGraftDistributions.ts` | Added `distributionType` parameter to `createQueenForRecipient` and `createQueensForRecipient`; sets `p_status: 'cell'` for queen cell distributions |
| `src/app/dashboard/queens/page.tsx` | Added `cell` to status filter and form dropdowns; amber badge for cell status; `mated_date` field in form (editable for distributed queens); cell count in summary stats; `mated_date` added to distributed queen allowed update fields |
| `src/app/dashboard/queens/[id]/page.tsx` | Amber cell banner with "Mark as Mated" (inline form: date + eircode) and "Mark as Failed" buttons; amber cell status badge; `mated_date` in identity section; offspring cell badge; `user_id` + `status: 'cell'` guards on mutations; `{ count: 'exact' }` for race-condition detection |
| `src/app/dashboard/hives/page.tsx` | Changed queen dropdown query from `.eq('status', 'active')` to `.in('status', ['active', 'cell'])`; added `status` to select; appends "(Cell)" label in dropdown |

### Code Audit Findings (all resolved)

| Severity | Issue | Fix |
|----------|-------|-----|
| **Critical** | `handleMarkMated`/`handleMarkFailed` missing `.eq('user_id')` — any authenticated user could mutate any queen | Added `.eq('user_id', currentUserId)` + early return if null |
| **High** | Race condition: two tabs could both "Mark as Mated" — no status precondition | Added `.eq('status', 'cell')` + `{ count: 'exact' }` + stale-state toast |
| **Medium** | Distributed queen update path silently dropped `mated_date` | Added `mated_date` to allowed fields list |
| **Medium** | `mated_date` form field was disabled for distributed queens (recipient can't set it) | Removed `disabled` and cursor-not-allowed styling |
| **Medium** | Offspring status badges missed amber `cell` styling | Added `cell` branch to offspring badge ternary |
| **Medium** | `matedDate`/`matedEircode` not reset after successful mark-as-mated | Added `setMatedDate('')` and `setMatedEircode('')` |

### What's Auto-Excluded
- **Breeder queen dropdown** (`batches/page.tsx`): Already filters `.eq('status', 'active')` — cell queens auto-excluded
- **Dashboard stats**: Counts active queens only — cell queens correctly excluded
