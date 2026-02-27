# Feature: GDD Average Temperature Indicator Fix
**Date:** 27/02/2026
**Status:** Implemented

## 1. Overview
Correct the average temperature indicator behaviour in the GDD accumulation chart so the plotted points move as expected over time and match the underlying monthly average temperature values.

## 2. Scope & Simplicity
* **In Scope:** Adjust temperature series mapping in the accumulation chart and document how the displayed values are derived.
* **Out of Scope:** Any redesign of the GDD UI, changes to phenology chart behaviour, or modifications to data source providers.
* **Existing Code Impact:** Limited to `src/components/research/GDDDataTab.tsx` plus documentation updates in `docs/features/`.

## 3. Technical Design
### Architecture
Update the accumulation chart dataset assembly to map monthly temperature averages to stable x-axis positions (one point per month), rather than relying on sparse 7-day labels coinciding with specific day-of-month windows.

### Database Connections (MCP Server)
No database or schema changes are required. Existing Supabase reads remain unchanged. This fix only affects client-side chart data preparation from existing Open-Meteo responses.

## 4. Edge Cases & Risks
* Partial current-month data could appear lower than completed months; this should remain expected and be represented clearly.
* If a month has no source daily values, the chart must continue to show `null` rather than a misleading default value.
* Year switching and temperature toggle interactions must keep tooltips and right-axis units consistent.

## 5. Implementation Phases
1. Phase 1: Replace brittle mid-month day matching with deterministic monthly point placement for the accumulation chart temperature dataset.
2. Phase 2: Validate tooltip/right-axis behaviour and update GDD feature documentation with value derivation and plotting rules.
