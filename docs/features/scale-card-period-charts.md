# Feature: Scale Card – Chart per Reporting Period

**Date:** 29 October 2026 · Research → Scale Overview

## 1. Overview

On the Scale Overview card, the "24 hours", "7 days" and "30 days" column headings of the weight-change table are buttons. Tapping one opens a dialog with that scale's weight chart, starting on the tapped period. The user can switch period inside the chart.

## 2. Scope & Simplicity

No new chart. The dialog shows the hive page's own charts:

| Scale | Component | Opens on |
|---|---|---|
| BEEP | `src/components/hive/ScaleHistoryChart.tsx` | Day / Week / Month |
| Wolf | `src/components/hive/WolfScalePanel.tsx` (stat tiles + chart) | Day / Week / Month |

Both gained one optional prop, `initialPeriod`. Without it they open as before (BEEP on Day, Wolf on Week), so the hive page is unchanged.

## 3. Technical Design

- **Period mapping:** the data routes serve `day` = last 24 hours, `week` = last 7 days, `month` = last 30 days, which are exactly the card's columns (`ChartPeriod` in `HiveScaleCard.tsx`).
- **Trigger:** each heading is a `<button>` with a chart icon and underline, a 48px tap area and an `aria-label` such as "Show the 7 days weight chart".
- **Dialog:** `ModalShell`, `max-w-3xl`, scrolls within 90% of the screen height; Escape, the close button or a tap outside closes it.
- **Load on demand:** both charts load through `next/dynamic` (`ssr: false`), so chart.js is downloaded only when a heading is tapped. Each open costs one scale request (Wolf adds two on first open for the battery, as on the hive page).
- **Wolf note:** the card's Wolf 7-day and 30-day changes leave out feeding and harvest jumps, but the chart draws raw weight. A note under the Wolf chart explains why its start-to-end difference can differ from the number tapped.

### Database Connections (MCP Server)

None.

## 4. Edge Cases & Risks

- A hive with both scale types shows the BEEP chart, matching the rest of the card.
- "Period before" has no chart of its own: the routes only serve windows ending now. The chart's Custom range covers earlier periods.
- The existing charts still use their own dark-mode colours and Chart.js's 12px text rather than `themeChartOptions`; aligning them would also change the hive page and is left for a separate change.

Related: [scale-card-labels-plan.md](./scale-card-labels-plan.md), [scale-overview.md](./scale-overview.md), [beep-scale.md](./beep-scale.md), [wolf-waagen.md](./wolf-waagen.md).
