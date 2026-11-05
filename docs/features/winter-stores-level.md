# Winter Stores Level

Record a colony's stores level (0–100) during an inspection, and show a red, amber or green dial on
the hive card, so a beekeeper can see whether stores are sufficient for winter. The plan and its
reasoning are in [winter-stores-level-plan.md](winter-stores-level-plan.md).

## Meaning of the level

100% means enough to get through winter, about 18 kg (the app's existing rough guide). Green
therefore starts at about 14 kg and amber at about 7 kg.

| Level | Colour | Word |
|---|---|---|
| 0–39 | Red | Low |
| 40–79 | Amber | Top up |
| 80–100 | Green | Enough |
| No reading | Grey | Not checked |

The bands, words and season rule are defined once, in `src/lib/stores-level.ts`.

## Data model

| Column | Type | Null | Meaning |
|---|---|---|---|
| `inspections.stores_level` | `smallint`, check 0–100 | yes | `NULL` = not recorded, distinct from a recorded 0 |

The column was added through the Supabase MCP, so there is no SQL file in the repo.

The older `honey_stores`, `store_frames`, `honey_super_fullness` and `weight` columns are unrelated
and were left untouched.

## Inspection form

- The Stores Level section is in step 2 (Queen and colony), for every hive, with or without supers.
- A new inspection starts as "Not recorded". It never pre-fills silently, because stores change
  between visits.
- The slider is always shown and reads "Not recorded" (spoken "Not recorded") until it is moved.
  Nothing is copied from the last visit and there is no starting value of 50, so moving the slider is
  the only way to record a reading (owner decision D2, 05/11/2026, as for super fullness). Clear
  returns the section to "Not recorded". A slider sitting at 0 has to be moved away and back to
  record exactly 0%.
- The last reading is shown for reference, from this season only (since 1 August, the same rule as
  the dial). From May to July there is no hint. Before 05/11/2026 it could come from any year (V12).
- A line under the scale gives the bands in words: "Low under 40% · Top up 40–79% · Enough 80% and
  over".
- The slider moves in steps of 5, and its colour follows the band.
- Changing the hive or apiary on a new inspection clears the reading, because it belongs to the hive
  it was taken on. Editing keeps it.

## Hive card dial

`src/components/hive/StoresDial.tsx`, rendered by `HiveListCard.tsx`, with data from `useHivesList`.

- It uses the newest inspection that recorded stores, so an inspection that skips the section leaves
  the dial as it was.
- It shows from 1 August to 30 April, using readings taken since 1 August. It is hidden from May to
  July, and the form section stays available all year.
- With no reading it is grey "Stores not checked", never red.
- Under the % and word it reads "Stores · Estimated 28 August", with the year added when the reading
  is from an earlier year (a December reading seen in February). The dial's spoken name includes it.
  It is a beekeeper's estimate at an inspection, not a live reading (WP09, 05/11/2026).
- The phone list row shows stores only when Low or Top up, now with the date: "Stores: Low,
  28 August".
- The % and word always sit beside the colour.
- Archived hives show no dial.

## Other places it appears

- The inspection record card, the review step and the hive detail history.
- Mel's `getLastInspection` reports the level.
- Mel's `getHivesNeedingFeeding` uses each hive's latest reading since 1 August, or within the
  requested look-back if that is longer. Low and Top up count as needing feed. Hives with no reading
  still fall back to the older signs (supers, notes and `honey_stores`).

## Known limits

- Feeding after a reading doesn't move the dial or Mel's answer until stores are next recorded.
- If one hive has two inspections with stores on the same date, the list picks between them by ID,
  not by time. Super Fullness behaves the same way.
- Nuc and wild colony inspections use separate tables and aren't covered.
- The yard map and the apiary page don't show the level.
- The inspection summary CSV doesn't include the level. The full data export does, automatically.
