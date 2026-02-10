# Decoupled QR Tags — Implementation Todo

## Tasks

- [x] 1. Database: Create `qr_tags` table via Supabase MCP migration
- [x] 2. Create tag code utility (`src/lib/qr-tags.ts`)
- [x] 3. Create tag scan landing page (`src/app/dashboard/hive-scan/tag/[code]/page.tsx`)
- [x] 4. Delete old hive-scan page (`src/app/dashboard/hive-scan/[id]/page.tsx`)
- [x] 5. Create QR Tags management page (`src/app/dashboard/qr-tags/page.tsx`)
- [x] 6. Update HiveQRCode component to use tag codes
- [x] 7. Update hive detail page to fetch assigned tag
- [x] 8. Add QR Tags to sidebar and mobile drawer navigation
- [x] 9. Create feature documentation (`docs/feature/qr-tags.md`)

## Review

### Summary of Changes

**Database:**
- Created `qr_tags` table with columns: id, code, user_id, hive_id, label, created_at, assigned_at
- `hive_id` uses `ON DELETE SET NULL` so deleted hives auto-unassign their tag
- RLS: anyone can read (needed for scan page), only owner can insert/update/delete

**New Files:**
- `src/lib/qr-tags.ts` — Generates `HC-XXXXXX` codes from unambiguous alphabet (~729M combinations)
- `src/app/dashboard/hive-scan/tag/[code]/page.tsx` — Scan landing page that looks up tag → shows hive record buttons or "not assigned" message
- `src/app/dashboard/qr-tags/page.tsx` — Full CRUD management page with generate, assign/reassign, delete, and batch print
- `docs/feature/qr-tags.md` — Feature documentation

**Modified Files:**
- `src/components/hive/HiveQRCode.tsx` — Changed props from `hiveId` to `tagCode`, URL now points to `/dashboard/hive-scan/tag/{tagCode}`
- `src/app/dashboard/hives/[id]/page.tsx` — Fetches assigned tag for the hive, shows QR code if tag exists or "no tag assigned" message with link to QR Tags page
- `src/components/Sidebar.tsx` — Added QR Tags nav item with QrCode icon
- `src/components/MobileDrawer.tsx` — Added QR Tags nav item with QrCode icon

**Deleted Files:**
- `src/app/dashboard/hive-scan/[id]/page.tsx` — Old hive-scan route (replaced by tag-based route)

### Notes
- No existing users were using the old QR codes, so the old route was safely removed
- The print batch feature uses an external QRCode library loaded via CDN in the print window to avoid bundling issues
- Tag generation handles unique constraint collisions gracefully with a user-facing error message
