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
- **Blank units:** an amount with no stored unit reads "(unit not recorded)", in this tool and in `getFeedingHistory`. See below.
- **Very long periods:** a response is capped at 1,000 rows. If that is reached, the result tells Mel the figures are incomplete and to suggest a shorter period.

## Blank units on feeding records

New feeding records started with a blank unit while the form's drop-down, which has no blank option, showed "Liters (L)". The form looked right but saved nothing, so most feedings since November 2025 have no unit. Fixed in `src/app/dashboard/records/page.tsx` (30 October 2026): new records start with L, and saving an older blank record stores L, as the form shows. Bulk feeding was never affected.

Existing blank syrup and HiveAlive records were set to L with the owner's confirmation (`supabase/migrations/20261030210000_feedings_blank_unit_litres.sql`, applied as `feedings_blank_unit_litres`). The update also moved those records' `updated_at`. Five records with no quantity keep their blank unit.

## Other suggestions reviewed

The log's three "only my own hives" entries, from January and February 2026, need no new tool. `getHiveOverview` takes `includeShared: false` and its description covers own hives only.

Related: [dashboard-today-screen.md](./dashboard-today-screen.md).
