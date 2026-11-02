# Winter Stores Level (plan)

Status: approved and implemented, 2 November 2026. See [winter-stores-level.md](winter-stores-level.md)
for how it works. The full plan, with mock-ups and the task list, is in `tasks/todo.html`.

## Goal

Record a colony's stores level (0–100) during an inspection and show a red, amber or green dial on
the hive card, so a beekeeper can see whether stores are sufficient for winter.

## Bands

| Level | Colour | Word |
|---|---|---|
| 0–39 | Red | Low |
| 40–79 | Amber | Top up |
| 80–100 | Green | Enough |
| No reading | Grey | Not checked |

Meaning of 100%: enough to get through winter, about 18 kg (the app's existing rough guide).

## Data model

| Column | Type | Null | Meaning |
|---|---|---|---|
| `inspections.stores_level` | `smallint`, check 0–100 | yes | `NULL` = not recorded, distinct from a recorded 0 |

The existing columns can't drive the dial:

- `honey_stores`: legacy text that no form writes, newest value 15/11/2025.
- `store_frames`: frames given or taken in a visit, not a level.
- `honey_super_fullness`: measures supers, which are usually off for winter.
- `weight`: gross weight on only 86 inspections.

## Behaviour

- The form section is in step 2, for every hive, and follows the
  [Honey Super Fullness](honey-super-fullness.md) pattern.
- A new inspection starts as not recorded and shows the last reading for reference. It never
  pre-fills silently.
- The card uses the newest inspection that recorded stores, and shows its date.
- Season: the dial shows from 1 August to 30 April, using readings since 1 August.
- Archived hives show no dial.

## Out of scope for the first build

Apiary and dashboard summaries, feed shortcuts, scale trends, a quick heft record, nucs (separate
table), reminders, and the CSV column.
