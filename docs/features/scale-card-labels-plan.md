# Feature: Scale Card Labels

**Date:** 29 October 2026 · **File:** `src/components/research/HiveScaleCard.tsx` (Research → Scale Overview)

## 1. Overview

The Scale Overview card showed all its data without saying what any number was. Every value is kept, and each is now labelled, following Wolf's own app: a large value with a small label underneath.

| Value | Label now shown |
|---|---|
| Scale name/serial | Second header line, "Scale 42J04513 (PE8QO7)" (no double brackets) |
| Apiary weather (Open-Meteo, not the scale) | "Outside now: 15°C · 74%" |
| Weight | "Total weight" |
| 24h / 7d / 30d change, in kg | Table: columns "24 hours / 7 days / 30 days", row "This period" |
| Bracketed figure | Row "Period before": the change over the period of the same length before (48–24 h ago, the 7 days before, the 30 days before) |
| Flame temperature | "Brood temp." for both scale types (BEEP: `t_i ?? t ?? t_0`; a low reading means the sensor sits outside the brood area) |
| Humidity | "Scale humidity" (measured by the scale) |
| Battery | "Battery" (red under 20%) |
| Sprout figure | "GDD since 1 Jan", whole number (Wolf calls it GTS) |

## 2. Fixes made on the way

- **Wolf humidity never showed:** the card read `lastValues.humidity`, but the parsed Wolf reading names it `humidity_percent`.
- **BEEP temperature:** first labelled "Inside temp.", then reverted the same day on the owner's correction. BEEP's sensor is a brood temperature sensor; a low reading (e.g. 12°C) only means it sits outside the brood area. Both scale types show "Brood temp.".
- **GDD decimal:** shown rounded.
- Change colours gained dark-mode shades (`green-700/400`, `red-700/400`); arrows stay so the direction does not depend on colour alone.

## 3. Technical design

Single-file change. No new requests or data. The three change chips became one small `changes` array rendered as a `<table>` (row and column headers for screen readers). Readings are a two-column grid of labelled tiles. Text is 14px or larger; figures use `tabular-nums`. Hover tooltips remain but nothing depends on them.

## 4. Not in this change

- Battery %: the hive page's Wolf panel uses 3.2–4.2 V, while the card uses 2.5–4.2 V, so the same scale can show different percentages.
- `hive_number` is typed `number` in the card and `ScaleOverviewTab`, but it is a string.

`scale-overview.md` (card layout and change maths) and `wolf-waagen.md` (card temperature and humidity) were updated with this change.
