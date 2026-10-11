# Feeding: 3:2 Sugar Syrup and "Syrup inverted" Flag

## Summary

- **Sugar Syrup (3:2)** is a new feed type. The syrups are listed in order of strength:
  1:1, 3:2, 2:1.
- A **Syrup inverted** checkbox records whether the syrup was inverted. It appears only when the
  feed type is a sugar syrup.

## Data

| Change | Where |
|---|---|
| New `dropdown_values` row `Sugar Syrup (3:2)`, `display_order` 2 (later rows shifted up by one) | `feed_type` category |
| `feedings.syrup_inverted boolean NOT NULL DEFAULT false` | `feedings` table |

Both changes were applied to the live DB through the MCP migration `feedings_syrup_3_2_and_inverted`.
There is no SQL file. Existing feedings read as "not inverted". The existing `feedings` RLS policies
cover the new column without changes.

## Behaviour

- `isSugarSyrup()` in `src/lib/feeding.ts` decides whether the checkbox shows. It matches any feed type
  starting with "Sugar Syrup", including a custom "Other" entry worded that way.
- On save, `syrup_inverted` is stored as `isSugarSyrup(feedType) && ticked`. If you tick the box and then
  switch to a non-syrup feed type, the tick is dropped and is never saved against fondant and similar.
- Both ways of writing a feeding get the checkbox:
  - Records → New/Edit Feeding (`FeedingForm`, saved by `handleFeedingSubmit` in `records/page.tsx`)
  - Hives → bulk **Record feeding** (`BulkFeedingModal`; the Hives page spreads its values into the insert)

## Display

- Records feeding card (`FeedingCard`): shows **Inverted: Yes** when set.
- Hive detail feeding list: shows "(inverted)" after the feed type.

## Related fix

The hive detail feeding list read `feeding.amount` with a hard-coded "kg", but the column is
`quantity` with its own `unit`. `amount` was always `undefined`, and `undefined !== null` let it
through, so the list rendered "undefined kg". `HiveFeeding` (`src/types/hive.ts`) now matches the table
(`quantity`, `unit`, `syrup_inverted`), and the list shows `quantity unit`.
