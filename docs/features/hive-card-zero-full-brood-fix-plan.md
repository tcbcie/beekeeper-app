# Hive Card: Zero Full Brood Boxes Rendered as One (Fix)

## Problem

On the Hives list, a hive configured with **0 full-size** and **1 half-size** brood box drew both
"Brood Half 1" and a phantom "Brood Full 1" in its Hive Setup stack.

## Root cause

Hive configs keep a legacy total, `brood_boxes`, which the hive form still always writes as `1`.
`HiveListCard.tsx` counted full boxes with `brood_boxes_full || brood_boxes || 0`. A deliberate `0` is
falsy, so it fell through to the legacy `1`. The frame-orientation marker check used the same `||` chain.

`Hive3D.tsx` and `InspectionForm.tsx` already used `??`, so the list card was the only reader with this
problem. Seven active hives were affected at the time of the fix.

## Fix

`HiveListCard.tsx` works out `fullBroodBoxes = brood_boxes_full ?? brood_boxes ?? 0` once and uses it
for both the full-box loop and the last-box frame-orientation marker. The legacy total now applies
only to old configs that have no `brood_boxes_full` at all.

No data change: the stored configs were correct, and only the drawing misread them.

## Note

A hive with only half-size boxes shows no frame-orientation marker. The marker is drawn on the last
full box, and before this fix it was showing on the phantom one.
