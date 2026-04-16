# Show QR Code on Hive Card

## Goal
Display the assigned QR tag code on each hive card in the hives list view when a QR tag is linked to that hive.

## Context
- QR tags live in `qr_tags` table: `{ id, code, hive_id, ... }`. A hive may have a linked tag via `qr_tags.hive_id`.
- Hive list is rendered by `src/components/hive/HiveListCard.tsx`.
- Hives are fetched in `src/app/dashboard/hives/page.tsx` (`fetchHives`).
- `Hive` type lives in `src/types/hive.ts`.

## Todo
- [x] Add optional `qr_tag_code?: string | null` field to `Hive` type in `src/types/hive.ts`.
- [x] In `fetchHives` (hives page), after the hives are loaded, batch-query `qr_tags` for `hive_id IN (hiveIds)` and build a `Map<hive_id, code>`.
- [x] Merge `qr_tag_code` into each hive in the `enrichedHives` map.
- [x] In `HiveListCard.tsx`, next to the hive number (same row as the scale icons), show a small QR badge (`QrCode` icon + `QR: {code}`) only when `hive.qr_tag_code` exists.
- [x] Use an existing lucide icon (`QrCode`) for consistency; keep the badge small to match the scale icons.

## Review
- Added `qr_tag_code?: string | null` to the `Hive` interface in `src/types/hive.ts`.
- In `src/app/dashboard/hives/page.tsx` `fetchHives`, added a single batched `qr_tags` query by `hive_id IN (hiveIds)` and built a `Map<hive_id, code>`. If a hive has multiple tags, the first one wins.
- Merged the code into each hive as `qr_tag_code` alongside existing enrichments.
- In `src/components/hive/HiveListCard.tsx`, added a small inline badge rendered next to the hive number (after the BEEP/Wolf scale icons) showing `QR: {code}` with a `QrCode` lucide icon. Only rendered when a code is present, so hives without tags are unaffected.
- No schema changes; read-only query against existing `qr_tags` table.
