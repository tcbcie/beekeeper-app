# Feature: DCA Fallback Hotspot Fix
**Date:** 16/04/2026
**Status:** Implemented

## 1. Overview
This fix ensures that a saved, valid apiary selected for DCA prediction can still produce a low-confidence hotspot when the normal ranking model would otherwise return no visible results. The goal is not to overstate confidence; it is to avoid the current silent failure mode where a real apiary appears to have no DCA at all because every candidate was filtered out.

## 2. Scope & Simplicity
* **In Scope:** Preserve a bounded fallback hotspot for valid selected apiaries; keep fallback results clearly marked as low confidence; expose fallback or zero-result messaging in the existing community-map panel; update the DCA feature note.
* **Out of Scope:** New terrain data sources, major scoring redesign, shared colony-density priors, schema changes, or a wider map UX overhaul.
* **Existing Code Impact:** `src/lib/dca-prediction.ts`, `src/hooks/useDCAPredictions.ts`, `src/app/dashboard/community-map/page.tsx`, and the DCA feature note.

## 3. Technical Design
### Architecture
The current DCA engine should continue to rank and filter hotspots as it does now, but it should not collapse to an empty result set for a valid selected apiary unless candidate generation genuinely failed.

The intended behaviour is:
1. Run the existing prediction pipeline normally.
2. Apply the normal threshold and merge logic.
3. If no predictions survive, preserve the strongest available candidate from the valid selected apiaries as a fallback result.
4. Force that preserved result to remain low confidence and label it as fallback-heavy or equivalent in the existing result metadata.
5. Surface the fallback state in the DCA selector panel so the user can tell the difference between:
   - a stronger normal prediction
   - a low-confidence fallback guess
   - a true failure where no candidate could be produced at all

The map should keep using the current DCA circle and flyway rendering path wherever possible.

### Database Connections (MCP Server)
No database schema or query-shape change is required for this fix.

The current Supabase flow remains sufficient:
* read user apiaries with non-null coordinates
* read user-private DCA confirmations
* continue using the existing confirmation insert path

No direct MCP database changes are planned.

## 4. Edge Cases & Risks
* A fallback result must never be presented with medium or high confidence.
* Single-apiary and flat-terrain cases must still communicate uncertainty honestly.
* True candidate-generation failures should still surface as errors rather than as fabricated hotspots.
* The panel should distinguish between fallback results and stronger results without adding a large new UI surface.

## 5. Implementation Phases
1. Phase 1: Preserve the strongest candidate as a low-confidence fallback when thresholding removes all normal results.
2. Phase 2: Expose fallback-state messaging through the hook and community-map panel.
3. Phase 3: Update the DCA feature note so the behaviour is explicit.
