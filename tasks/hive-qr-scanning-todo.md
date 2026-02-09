# Hive QR Code Scanning - Implementation Plan

## Tasks

- [x] Step 1: Create QR landing page (`src/app/dashboard/hive-scan/[id]/page.tsx`)
- [x] Step 2: Create HiveQRCode component (`src/components/hive/HiveQRCode.tsx`)
- [x] Step 3: Add QR button + modal to hive detail page (`src/app/dashboard/hives/[id]/page.tsx`)
- [x] Step 4: Create feature documentation (`docs/features/hive-qr-scanning.md`)

## Notes

- No database changes needed
- No new dependencies needed (`qrcode.react` already installed)
- Reuses existing `QuickActionsGrid` pattern and `downloadQrCode` pattern from TraceabilityTool
- Native phone camera handles QR scanning (no in-app scanner)

## Review

### Changes Made

**New files:**
- `src/app/dashboard/hive-scan/[id]/page.tsx` - Landing page that loads when a QR code is scanned. Fetches hive data (name + apiary) and displays a grid of 5 record type buttons (Inspection, Varroa Check, Treatment, Feeding, Harvest). Auth-protected via dashboard layout.
- `src/components/hive/HiveQRCode.tsx` - Reusable component that renders a QR code using `QRCodeSVG`. Includes Download PNG button (reuses `downloadQrCode` pattern from TraceabilityTool) and Print button that opens a print window.
- `docs/features/hive-qr-scanning.md` - Feature documentation.

**Modified files:**
- `src/app/dashboard/hives/[id]/page.tsx` - Added `QrCode` and `X` icon imports, `HiveQRCode` component import, `showQrModal` state, a QR icon button next to "View Records" in the header, and a modal overlay that renders `HiveQRCode`.

### What was reused
- `QuickActionsGrid` button styling and layout from hive detail page
- `downloadQrCode` SVG-to-PNG pattern from TraceabilityTool
- Existing `?hive={id}&type={type}` query param handling in records page
- Dashboard layout auth protection
- `getCurrentUserId` from `@/lib/auth`
- `LoadingSpinner` component

### No database changes, no new dependencies
