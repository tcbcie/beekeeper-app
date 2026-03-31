# Feature: Queen Tracker Expanded Queen Detail
**Date:** 31/03/2026
**Status:** Implemented

## 1. Overview
Refine the `Queen Tracker` tab so it reads as a proper queen register for distributed rearing-group queens rather than a narrow distribution log. The refreshed view will surface the fuller set of queen, batch, breeder, recipient, and outcome details already available in the system, while reorganising the layout so the most important information is easier to scan and act on.

## 2. Scope & Simplicity
* **In Scope:** Expand the tracker query to include more existing related data; redesign the desktop and mobile presentation around queen identity and grouped lifecycle details; keep the existing filters and outcome toggles; document the richer tracker layout and data coverage.
* **Out of Scope:** Creating a brand-new route, replacing the standalone Queens registry, changing distribution creation flows, or adding speculative joins to recipient queens that cannot be matched reliably from current data.
* **Existing Code Impact:** Keep the change contained to `useQueenTracker.ts`, `QueenTrackerTab.tsx`, and the related feature documentation.

## 3. Technical Design
### Architecture
The existing `Queen Tracker` tab will remain on `/dashboard/batches` and continue to use `useQueenTracker`. The hook will be broadened to expose a richer, normalised tracker record, and the component will be reshaped into a queen-first layout with clearer visual grouping for identity, provenance, destination, and outcomes.

### Database Connections (MCP Server)
The live schema has been checked through the MCP server. The current tables already expose useful fields through `graft_distributions`, `batch_grafts`, `rearing_batches`, `apiaries`, and `queens`, including recipient location/contact fields, lifecycle dates, breeder/batch context, and graft-level queen identifiers. The first pass should therefore use wider Supabase joins and mapping logic rather than a migration. If a missing detail proves essential and cannot be derived safely, that gap will be raised before any schema change is proposed.

## 4. Edge Cases & Risks
* Some attractive queen-registry fields are not linked to tracker rows by a guaranteed direct foreign key, so the implementation must avoid ambiguous joins that could attach the wrong queen record.
* Desktop density can easily become worse if more fields are simply added as extra columns, so the redesign needs stronger grouping rather than a wider spreadsheet.
* Mobile cards must remain editable for outcome toggles without burying the controls too deeply.
* Empty optional fields such as phone, hive, notes, and hybridisation dates need clear fallbacks so the richer layout does not look broken or noisy.
* Group-owner visibility rules must remain unchanged while the query shape expands.

## 5. Implementation Phases
1. Phase 1: Extend the tracker hook to expose the additional existing details needed for a queen-centric view and keep the mapped record type coherent.
2. Phase 2: Redesign the desktop and mobile tracker presentation so each queen record shows fuller context in a more structured layout, while preserving the existing filters and outcome updates.
