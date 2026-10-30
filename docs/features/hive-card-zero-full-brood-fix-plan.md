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

## Follow-up: frame-orientation marker on half-box-only hives

After the fix above, a hive with only half-size boxes lost its frame-orientation (warm/cold) marker. The
marker was only ever drawn on the last full box, and before the fix it was sitting on the phantom one.
The marker JSX is now a single `frameOrientationMarker` constant drawn on the **bottom brood box**: the
last full box, or the last half box when `fullBroodBoxes === 0`. The half box gained `relative`
positioning, and a `relative z-10` label so the text stays above the lines. `halfBroodBoxes` uses `??`,
like `fullBroodBoxes`. Hives with full boxes render exactly as before. At the time this affected 2 active
hives.
