# Feature: Dashboard Apiary Queenright Status
**Date:** 14/03/2026
**Status:** Implemented

## 1. Overview
Show a compact queenright status on each dashboard apiary card so beekeepers can see whether the apiary has recent inspection evidence of a queen. The implemented status is derived from inspections that recorded either eggs present or queen seen, with a warning presentation when that evidence is more than 21 days old.

## 2. Scope & Simplicity
* **In Scope:** Add derived queenright metadata to dashboard apiary data, render that status on the existing dashboard apiary cards, and warn when the latest positive signal is older than three weeks.
* **Out of Scope:** Changing inspection workflows, adding new database columns, inferring queen state from any records beyond inspections, or redesigning the entire dashboard card layout.
* **Existing Code Impact:** Touch only the dashboard apiary type, the dashboard enrichment hook, the apiary weather card component, and the dashboard card feature documentation.

## 3. Technical Design
### Architecture
The existing `useDashboardStats` hook already enriches raw apiary rows with hive counts, inspection recency, and task counts before passing them into `ApiaryWeatherRow`. This implementation extends that enrichment stage with a derived `lastQueenrightDate` value and renders a compact `Queenright` status block in the current stats row.

### Database Connections (MCP Server)
The live `public.inspections` table was checked through the MCP server. The feature continues using the existing Supabase client query path, expanding the inspection selection to include `queen_seen` and `eggs_present`. Because both columns are nullable booleans, the derivation logic treats null as false and only records a queenright date when either field is explicitly true. No schema change was required.

## 4. Edge Cases & Risks
* Apiaries with inspections but no positive queenright evidence must not be shown as queenright.
* Null `queen_seen` or `eggs_present` values must not be coerced into truthy states.
* Apiaries with no hives or no inspections need a neutral fallback that does not imply healthy queen status.
* Malformed date strings must degrade safely rather than rendering negative or invalid recency values.
* The extra card content must stay compact enough to avoid breaking the current card layout on narrower viewports.

## 5. Implementation Phases
1. Phase 1: Extend dashboard apiary enrichment with the latest positive queenright evidence date per apiary.
2. Phase 2: Render a compact queenright indicator with a stale-warning presentation on the dashboard apiary card and update the feature documentation.
