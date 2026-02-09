# Hive QR Code Scanning

## Overview

Beekeepers can generate QR codes for individual hives, print them, and attach them to the physical hive. Scanning the QR code with a phone camera opens a landing page where the beekeeper can immediately create a record (inspection, varroa check, treatment, feeding, or harvest) for that hive.

## How It Works

1. **Generate QR** - On the hive detail page, tap the QR icon button in the header to view the QR code
2. **Download/Print** - Download as PNG or print directly from the modal
3. **Attach to Hive** - Print and affix the QR code to the physical hive
4. **Scan in Field** - Use the phone's native camera to scan the QR code
5. **Create Record** - The scan opens a landing page with record type buttons; tap one to create a record with the hive pre-selected

## Architecture

```
Physical QR on Hive
        |
        v  (phone camera scans, opens URL)
/dashboard/hive-scan/{hiveId}     (auth-protected landing page)
        |
        v  (user taps record type button)
/dashboard/records?hive={hiveId}&type={type}   (existing records page)
        |
        v  (existing logic opens form with hive pre-selected)
Record Form (InspectionForm, etc.)
```

## Key Design Decisions

- **Native camera scanning** - No in-app QR scanner needed. All modern phones (iOS 11+, Android 9+) detect QR codes from the camera app
- **Authenticated route** - Uses `/dashboard/` route for free auth protection. Unauthenticated users are redirected to login
- **No database changes** - QR codes encode the existing hive UUID in a URL
- **No new dependencies** - `qrcode.react` was already installed

## Files

| File | Description |
|------|-------------|
| `src/app/dashboard/hive-scan/[id]/page.tsx` | QR landing page with hive info + record type buttons |
| `src/components/hive/HiveQRCode.tsx` | QR code display with download/print functionality |
| `src/app/dashboard/hives/[id]/page.tsx` | Modified - QR button + modal added to header |

## Record Types Available

- Inspection
- Varroa Check
- Varroa Treatment
- Feeding
- Harvest

## Shared Hive Support

Team members with shared access can scan QR codes for shared hives and create records against them, since the Supabase RLS policies already handle shared hive visibility.
