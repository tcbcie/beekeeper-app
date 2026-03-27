# Feature: Community Map Privileged Defaults
**Date:** 27/03/2026
**Status:** Implemented

## 1. Overview
Adjust the Community Map so privileged overlays are less intrusive on first load for Power Users and Admins. Wild colonies now start hidden, and conservation areas also start hidden for those privileged users while remaining available through the existing visibility toggles.

## 2. Scope & Simplicity
* **In Scope:** Change only the initial client-side visibility defaults for the relevant Community Map layers and document the behaviour.
* **Out of Scope:** Any redesign of the map controls, changes to role permissions, persistence of layer preferences, database changes, or Settings-page navigation changes.
* **Existing Code Impact:** Touch the Community Map page component and this feature note only.

## 3. Technical Design
### Architecture
The Community Map already controls layer visibility through local React state in `src/app/dashboard/community-map/page.tsx`. This change reuses that pattern by updating the initial visibility state during the authenticated bootstrap flow for privileged users, while keeping the existing toggle controls, marker rendering, and layer rendering checks intact.

### Database Connections (MCP Server)
No database change is required. The map can continue fetching `shared_apiaries_obfuscated`, `wild_colonies_obfuscated`, and `conservation_areas` exactly as it does now. Only the initial visibility of the rendered overlays changes.

## 4. Edge Cases & Risks
* Wild colonies must remain available immediately when a Power User or Admin enables the toggle after load.
* Conservation areas must still render correctly when re-enabled after load.
* Stats badges may continue showing available counts even when the corresponding layer starts hidden.
* The change must not affect regular users' access permissions or DCA prediction behaviour.
* The Settings page already defaults to `Profile`; this change should not introduce any Settings-page side effects.

## 5. Implementation Phases
1. Phase 1: Change the initial Community Map visibility state for wild colonies so privileged users start with the layer hidden.
2. Phase 2: Change the initial Community Map visibility state for conservation areas so privileged users start with the layer hidden.
3. Phase 3: Document the privileged default behaviour for future maintenance.

## Implementation Notes
The map still fetches privileged and conservation-area data as before. Only the initial selected state changes for Power Users and Admins before the map is shown, so users can re-enable either layer immediately without reloading the page.
