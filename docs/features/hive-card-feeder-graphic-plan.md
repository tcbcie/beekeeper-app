# Hive Card Feeder Graphic

**Date:** 02/11/2026
**Status:** Built 02/11/2026, all four types kept in the form by the owner's decision. Not yet checked on a real phone. The pieces went inline in `HiveListCard.tsx`, where the rest of the stack lives, so no new file was needed.

## 1. Today

The Hive Setup panel on `HiveListCard` draws supers, excluder, brood boxes and floor, but never the
feeder. The feeder appears only as a text line under the drawing, with a honey pot emoji that is also
used for honey supers. A beekeeper scanning the cards cannot see at a glance which hives have one.

On active hives, 64 of 305 have a feeder: 60 top, 3 frame, 1 Boardman, and none use entrance
(checked 02/11/2026). The form always sets `feeder_type` and `feeder` together, so `feeder_type`
is enough to read.

## 2. The change

Draw the feeder where it physically sits, in one colour kept for feeders. Blue separates it from the
amber and yellow boxes and matches the feeder in the apiary 3D view (`Hive3D.tsx`).

| Type | Drawn as |
|---|---|
| Top | A blue layer across the top of the stack, above the supers |
| Frame | A blue upright bar at the left of the top brood box |
| Entrance | A low blue block at the front of the floor |
| Boardman | The same block, with a small jar standing on it |

Below the drawing, the existing text line stays with a blue square in place of the emoji, so the
type is always in words and colour is never the only signal. No feeder means nothing is drawn.
A frame feeder on a hive with no brood boxes, or a type the card does not recognise, shows the text
line only.

## 3. Files

| File | Change |
|---|---|
| `src/components/hive/HiveFeederGraphic.tsx` | New: the small drawn pieces, marked `aria-hidden` |
| `src/components/hive/HiveListCard.tsx` | Places them in the stack, and updates the text line |

## 4. Out of scope

* The compact List rows on phones, which do not show Hive Setup at all. A feeder shows there only in
  Cards view.
* Any change to the hive form, stored data or the 3D view.

## 5. Verification

`npx tsc --noEmit`, `npx eslint`, related tests and the `qa-engineer` audit. Light and dark mode, and
the real-phone check, are the owner's.
