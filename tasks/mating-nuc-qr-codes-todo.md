# Task: Mating Nuc QR Codes & Equipment Management
**Date:** 27/03/2026
**Status:** Complete

## Objective
Add QR code support for mating nucs and a standalone equipment management page.

## Tasks

- [x] Phase 1: Database migration — add `mating_nuc_id` to `qr_tags`, `equipment_status` to `mating_nucs`
- [x] Phase 2: Update `generateTagCode()` with prefix parameter (default 'HC', 'MN' for nucs)
- [x] Phase 3: Create `NucQRCode` component (clone of HiveQRCode with nuc labels)
- [x] Phase 4: Update scan landing page with mating nuc render branch
- [x] Phase 5: Update QR tags management page (generate MN- tags, assign to nucs, display nuc assignments)
- [x] Phase 6: Create standalone `/dashboard/mating-nucs` page
- [x] Phase 7: Add "Mating Nucs" to sidebar navigation
- [x] Phase 8: Create feature documentation

## Review

### Summary of Changes

**Database (Supabase migration: `add_mating_nuc_qr_support`):**
- Added `mating_nuc_id` FK column to `qr_tags` with CHECK constraint (can't assign to both hive and nuc) and partial unique index (one tag per nuc)
- Added `equipment_status` column to `mating_nucs` with CHECK constraint (active/ready/retired), defaulting to 'active'

**Modified files:**
- `src/lib/qr-tags.ts` — Added optional `prefix` parameter to `generateTagCode()`
- `src/app/dashboard/hive-scan/tag/[code]/page.tsx` — Extended with mating nuc render branch (nuc info + View Details / New Inspection buttons)
- `src/app/dashboard/qr-tags/page.tsx` — Added tag type selector in generate modal, target type selector in assign modal, nuc assignment display in tag lists
- `src/lib/navigation.ts` — Added "Mating Nucs" nav entry with Box icon under Manage group

**New files:**
- `src/components/mating-nucs/NucQRCode.tsx` — QR code component for mating nucs (download/print)
- `src/app/dashboard/mating-nucs/page.tsx` — Standalone equipment management page with filters, expandable cards, inspection panel, QR modal
- `docs/features/mating-nuc-qr-codes.md` — Feature documentation

**Unchanged:**
- `src/components/batches/MatingNucsTab.tsx` — No changes to the batch-oriented workflow

### Design Decisions
- **MN-XXXXXX** prefix for nuc tags (visually distinct from HC-XXXXXX hive tags)
- Extended existing `qr_tags` table rather than creating a separate table
- Single scan URL path with conditional rendering (no new route for nuc scans)
- Equipment status is orthogonal to queen-rearing status
