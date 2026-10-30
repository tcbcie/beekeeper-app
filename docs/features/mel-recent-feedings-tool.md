# Feature: Mel Recent Feedings Tool

**Date:** 30 October 2026 · **Status:** Implemented

## Overview

Mel could only read feedings for one named hive, so "Which hives did I feed in the last six weeks and how much" reached AI Tool Suggestions as a gap. `getRecentFeedings` (`src/lib/ai/tools/feeding.ts`) answers it across all hives.

## Behaviour

- **Period:** up to 365 days, default 42 (six weeks).
- **Scope:** own and team apiaries, or own only when the user asks. Archived hives count, as they were still fed in that period.
- **Per hive:** apiary, times fed, last fed, amounts, and how many feedings have no amount recorded. Hives appear most recently fed first.
- **Totals:** across all the hives.
- **Amounts add up only within the same feed and unit,** so litres of syrup and kilos of fondant stay separate. "L" and "liters" count as one unit.
- **Very long periods:** a response is capped at 1,000 rows. If that is reached, the result tells Mel the figures are incomplete and to suggest a shorter period.

## Other suggestions reviewed

The log's three "only my own hives" entries, from January and February 2026, need no new tool. `getHiveOverview` takes `includeShared: false` and its description covers own hives only.

Related: [dashboard-today-screen.md](./dashboard-today-screen.md).
