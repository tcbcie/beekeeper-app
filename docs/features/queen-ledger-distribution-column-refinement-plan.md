# Feature: Queen Ledger Distribution Column Refinement
**Date:** 01/04/2026
**Status:** Implemented

## 1. Overview
This change refines the Queen Ledger distribution summary so it reads more clearly at table level. The column will be renamed from `Destination` to `Distribution`, the compact row will prioritise the recipient name or email, each record will show whether the queen was distributed to a group member, an app user, or a public recipient, and the `Actions` column will move back between `Queen` and `Status`.

## 2. Scope & Simplicity
* **In Scope:** Rename the summary column to `Distribution`, compact the recipient display to name-first or email-only fallback, add a clear recipient-type indicator, move `Actions` back between `Queen` and `Status`, and keep the fuller distribution context in the expanded detail row.
* **Out of Scope:** Changing the actual distribution workflow, editing recipient details, changing permissions, or altering NIHBS reporting behaviour.
* **Existing Code Impact:** The work should stay limited to `src/hooks/useQueenTracker.ts`, `src/components/batches/QueenTrackerTab.tsx`, and `docs/features/queen-tracker.md`.

## 3. Technical Design
### Architecture
The Queen Ledger remains a client-rendered table-first component. The hook will expose a small recipient-type classification so the row component can show a compact but meaningful distribution summary without embedding broader conditional logic directly in the table rendering. The table layout will also be reordered so `Actions` sits beside the queen identity and before `Status`.

### Database Connections (MCP Server)
No schema change is expected. Runtime data may need one small additional membership lookup so the hook can distinguish a recipient who belongs to the same rearing group from a general app user. No offline `.sql` parsing will be used.

## 4. Edge Cases & Risks
* Recipient names may be blank even when an app user exists, so the display needs a clean email fallback.
* Public distributions may only have partial external-recipient fields, so the row must avoid blank labels.
* Group-member classification must be based on real same-group membership rather than assuming every app recipient in a group batch is a group member.
* The restored `Actions` position must not reintroduce the earlier spacing problem between the identity and status area.

## 5. Implementation Phases
1. Phase 1: Add a minimal recipient-type classification path to the tracker data.
2. Phase 2: Rework the summary column to use the new `Distribution` wording, tighter recipient display, and restored `Actions` placement between `Queen` and `Status`.

## 6. Implementation Notes
The Queen Ledger now classifies each distribution as `Group Member`, `App User`, or `Public Recipient` using the recipient user ID plus same-group membership data. The summary row header now reads `Distribution`, the compact row shows recipient name first or falls back to email, and `Actions` now sits between `Queen` and `Status`.
