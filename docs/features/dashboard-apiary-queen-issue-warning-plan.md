# Feature: Dashboard Apiary Queen Issue Warning
**Date:** 14/03/2026
**Status:** Implemented

## 1. Overview
Refine the dashboard apiary cards so they no longer rely only on the latest positive apiary-wide queenright signal. The cards now warn when any hive in the apiary appears to be missing a recent queenright signal, while also considering brood absence so a short summer brood break does not trigger an early false alarm.

## 2. Scope & Simplicity
* **In Scope:** Derive per-hive recency for queenright evidence and brood presence from inspections, roll those signals up into an apiary-level warning state, and update the dashboard card presentation to show `Possible issue` when one or more hives look at risk.
* **Out of Scope:** Changing inspection capture fields, adding database columns, introducing season-aware heuristics beyond the fixed 21-day tolerance, or redesigning the entire dashboard card layout.
* **Existing Code Impact:** Touch only the dashboard apiary types, the dashboard enrichment hook, the dashboard apiary card component, and the dashboard card feature documentation.

## 3. Technical Design
### Architecture
`useDashboardStats` already fetches all inspections for the hives shown on the dashboard. The implementation now builds a per-hive health summary from that inspection stream, then derives apiary-level warning metadata such as how many hives lack a recent queen signal and how many have a broodless run older than 21 days. `ApiaryWeatherRow` consumes those derived counts and prioritises a warning-first card state when the apiary contains at-risk hives.

### Database Connections (MCP Server)
The live `public.inspections` table was checked through the MCP server. The feature continues using the existing Supabase query path and interprets these fields as follows:
- `queen_seen` and `eggs_present` are nullable booleans and only count when explicitly `true`
- `brood_frames` is a nullable integer and only counts as brood when greater than zero
- `eggs_present` also counts as brood evidence because it confirms active brood rather than a brood break
- no schema change was required

## 4. Edge Cases & Risks
* One healthy hive must not hide another hive in the same apiary that has no recent queen signal.
* A recent broodless inspection must not trigger an immediate brood alarm because short brood breaks can happen in summer.
* Null inspection flags and null brood counts must not create false healthy or false warning states.
* Apiaries with no hives still need a neutral fallback rather than an alarm.
* The warning UI must stay compact enough to fit the existing dashboard card layout on narrower viewports.

## 5. Implementation Phases
1. Phase 1: Extend dashboard enrichment with per-hive queenright and brood recency, then derive apiary-level risk metadata.
2. Phase 2: Update the dashboard apiary card to prioritise `Possible issue` when any hive breaches the warning rules and document the new behaviour.
