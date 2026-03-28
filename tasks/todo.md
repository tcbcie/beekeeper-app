# Task: Show QR Code Number Beside Nuc Number in Nuc Setup

**Date:** 28/03/2026
**Status:** Complete

## Objective
When a nuc has a QR code assigned, display the QR tag code (e.g. `MN-XXXXXX`) beside the nuc number in the Nuc Setup tab card header.

## Plan

- [x] 1. Add state to store QR tag codes mapped to nuc IDs in MatingNucsTab
- [x] 2. Fetch QR tag codes after nucs are loaded (same pattern as `fetchInventoryNucs`)
- [x] 3. Display the tag code next to the nuc number in the card header

## Review

### Changes Made

- **`src/components/batches/MatingNucsTab.tsx`**
  - Added `nucTagCodes` state (`Record<string, string>`) to map nuc IDs to QR tag codes
  - Added QR tag fetch inside `fetchNucs` — after nucs are loaded, queries `qr_tags` for all displayed nuc IDs and builds a lookup map
  - Added tag code display in nuc card header — shows `(MN-XXXXXX)` in secondary text beside the nuc number when a tag is assigned
