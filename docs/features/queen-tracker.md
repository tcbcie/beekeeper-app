# Feature: Queen Tracker
**Date:** 31/03/2026
**Status:** Implemented

## 1. Overview
The Queen Tracker is the `Queen Tracker` tab on the Queen Rearing page (`/dashboard/batches`). It follows queens distributed from visible rearing-group batches and from the current user's non-group batches, and presents each one as a fuller queen record rather than a narrow distribution row.

The tracker now combines:
- Queen identity context such as cell number, queen tagged number, marking state, recorded marking colour where marked, age, and latest weight
- Breeding provenance such as batch, breeder, mother queen, mother marking and age, graft date, emergence date, and source mating apiary
- Destination context such as recipient, contact details, recipient apiary or hive, and recorded mating location
- Lifecycle outcomes such as mating confirmation, overwintering, and hybridisation status

## 2. Scope & Simplicity
* **In Scope:**
  - Track queen cell, virgin queen, and mated queen distributions from visible group-linked batches and from the current user's non-group batches
  - Surface the fuller set of existing queen, batch, breeder, recipient, and outcome details already available in the system
  - Present the tracker as a denser table-first ledger with expandable detail rows for fuller queen context
  - Provide dynamic `Group -> Member -> Batch` filtering, alongside the existing year and status filters
  - Keep the existing overwintering and hybridisation update actions

* **Out of Scope:**
  - Creating a brand-new route or replacing the standalone Queens registry
  - Editing recipient details from inside the tracker
  - Adding speculative joins to recipient queen records where no reliable direct link exists
  - Changing distribution creation flows or the underlying rearing workflow

* **Existing Code Impact:**
  - `src/hooks/useQueenTracker.ts`
  - `src/components/batches/QueenTrackerTab.tsx`

## 3. Technical Design

### Architecture
The feature remains a client-rendered tab on `/dashboard/batches` and continues to use `useQueenTracker` as its data source. The hook now exposes a richer normalised record, and the component renders that data in a table-first queen ledger with expandable detail rows.

### Database Connections (MCP Server)
The live schema was checked through the MCP server before implementation. No migration was required.

The tracker now uses broader joins and mapping over existing tables:
- `graft_distributions` for distribution and outcome fields
- `batch_grafts` for cell number, queen marking, queen number, graft stage, and stage date
- `queen_weights` for the latest recorded queen weight per graft
- `rearing_batches` for batch dates, optional group linkage, and batch ownership
- `rearing_group_members` to distinguish distributions to same-group members from other app users
- `rearing_batches -> apiaries!mating_apiary_id` for source mating apiary context
- `rearing_batches -> queens!mother_queen_id` for mother queen context
- `graft_distributions -> profiles / apiaries / hives` for recipient and destination details

The tracker now resolves group ownership from `rearing_groups.owner_id`, matching the rest of the rearing-group feature instead of inferring ownership from membership-role rows alone.
The ledger visibility path now normalises nullable group IDs before owner checks so the non-group branch stays explicit and the hook remains build-safe.
The ledger also normalises the batch owner profile join before deriving `batch_owner_name`, so the `Member` filter shows the real distributing member name when profile data exists.
Non-group batches are intentionally limited to the current user's own ledger rows.
The ledger fetch path now queries owned ledger rows directly from `graft_distributions.user_id`, only adds additional group rows for groups owned by the current user, deduplicates graft IDs before the `queen_weights` lookup, and skips malformed rows without a valid cell number instead of fabricating `Cell #0`.
The recent hardening pass also required a follow-up parse fix in `useQueenTracker` so the owned-row and owned-group query-builder path compiles cleanly.

## 4. Visibility Rules
- **Group members:** See their own distributions from group-linked batches
- **Group owners:** See all member distributions from their groups
- **Non-group batches:** See their own non-group ledger rows
- **Edit access:** Only the distributing member can update overwintering and hybridisation status for a tracker row
- **Read-only state:** Group owners can view member records that they do not own, but those rows render as read-only in the tracker UI
- **NIHBS boundary:** Non-group batches stay out of NIHBS reporting because the report path only counts batches linked to the selected group

## 5. UI Structure

### Filters
- Group
- Member
- Batch
- Year
- Status (`All`, `Pending mating`, `Mated`, `Overwintered`, `Failed`)

The Group filter includes a dedicated non-group scope whenever the user has visible non-group ledger rows. Member and Batch options are derived from the rows that remain after the upstream selections, so owners can drill down through group members while ordinary members only see the member scope available to them.
The ledger header now drops the descriptive intro copy and keeps a dedicated filter tray so the controls stay focused on actual filtering work across desktop and mobile widths.

### Summary Strip
The ledger totals now sit inside a collapsible summary strip that starts closed by default. It still shows:
- Tracked queens
- Mated
- Overwintered
- Failed
- Hybridised

### Table Layout
Each tracked queen now renders as a dense summary row with:
- **Details:** Expand or collapse control in the first column so row inspection starts at the left edge
- **Queen:** Cell title, compact marked and tagged indicators clustered beside it, an explicit `Age ...` summary line, and a selected-row treatment so the active row stays obvious
- **Actions:** `Overwintered` and `Hybridised` share one compact action column between `Queen` and `Status`, with the two toggles stacked vertically for faster scanning
- **Status:** Distribution type and lifecycle state in a tighter, narrower column
- **Distribution:** Recipient name-first or email fallback, a compact distribution-type cue (`Group Member`, `App User`, or `Public Recipient`), and distribution date

Read-only member rows now use a distinct row treatment instead of a dedicated `Read only` badge in the Status column.
Expanded rows now hold the broader queen record panels and supporting context, including group, member, batch, latest weight, and the editable outcome dates.
Read-only records still show their restricted-edit explanation inside the expanded Outcomes panel.
Stage data is no longer surfaced in the Queen Ledger UI.

## 6. Outcome Logic

### Mated
A record is considered mated when either:
- `mating_confirmed = true`, or
- `distribution_type = 'mated_queen'`

### Overwintered
- Three-state toggle: unknown, yes, no
- Date defaults to the local calendar date when the user first sets an outcome, but it can then be edited from the expanded Outcomes panel
- Date is cleared when reset to unknown
- The overwintered date editor is user-controlled inside the expanded record, so members can correct historical outcome dates without widening the main table
- A write is only treated as successful when Supabase returns the updated row

### Hybridised
- Three-state toggle: unknown, yes, no
- When set to yes, `hybridisation_date` defaults to today and remains editable from the expanded Outcomes panel
- When reset to no or unknown, the hybridisation date is cleared
- Hybridisation date edits use the same per-row in-flight guard as the toggle path
- The hybridisation date editor is controlled so failed writes revert to the persisted value, and cleared values no longer leave stale input state behind
- A write is only treated as successful when Supabase returns the updated row

## 7. Risks And Constraints
- The tracker intentionally avoids joining directly to recipient queen records because the current schema does not provide a guaranteed direct link from a tracker row to a specific queen row.
- The richer layout depends on optional fields that may be empty, so the UI uses explicit fallbacks instead of leaving gaps.
- The tracker remains distribution-led under the hood even though the presentation is queen-led.
- Visibility and editability are intentionally different: group owners may see more rows than they are allowed to edit under current RLS rules.

## 8. Files Modified
- `src/hooks/useQueenTracker.ts`
- `src/components/batches/QueenTrackerTab.tsx`
- `src/hooks/useNIHBSReport.ts`
- `docs/features/queen-tracker.md`
