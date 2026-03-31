# Feature: Queen Tracker
**Date:** 31/03/2026
**Status:** Implemented

## 1. Overview
The Queen Tracker is the `Queen Tracker` tab on the Queen Rearing page (`/dashboard/batches`). It follows queens distributed from rearing-group batches and presents each one as a fuller queen record rather than a narrow distribution row.

The tracker now combines:
- Queen identity context such as cell number, queen number, marking state, marking colour, age, latest weight, and current graft stage
- Breeding provenance such as batch, breeder, mother queen, mother marking and age, graft date, emergence date, and source mating apiary
- Destination context such as recipient, contact details, recipient apiary or hive, and recorded mating location
- Lifecycle outcomes such as mating confirmation, overwintering, and hybridisation status

## 2. Scope & Simplicity
* **In Scope:**
  - Track queen cell, virgin queen, and mated queen distributions from group-linked batches
  - Surface the fuller set of existing queen, batch, breeder, recipient, and outcome details already available in the system
  - Present the tracker as a queen-led responsive ledger with grouped sections instead of a cramped desktop table
  - Keep the existing group, year, and status filters
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
The feature remains a client-rendered tab on `/dashboard/batches` and continues to use `useQueenTracker` as its data source. The hook now exposes a richer normalised record, and the component renders that data in a queen-centric card ledger that works on both desktop and mobile.

### Database Connections (MCP Server)
The live schema was checked through the MCP server before implementation. No migration was required.

The tracker now uses broader joins and mapping over existing tables:
- `graft_distributions` for distribution and outcome fields
- `batch_grafts` for cell number, queen marking, queen number, graft stage, and stage date
- `queen_weights` for the latest recorded queen weight per graft
- `rearing_batches` for batch dates, group linkage, and batch ownership
- `rearing_batches -> apiaries!mating_apiary_id` for source mating apiary context
- `rearing_batches -> queens!mother_queen_id` for mother queen context
- `graft_distributions -> profiles / apiaries / hives` for recipient and destination details

The tracker now resolves group ownership from `rearing_groups.owner_id`, matching the rest of the rearing-group feature instead of inferring ownership from membership-role rows alone.

## 4. Visibility Rules
- **Group members:** See their own distributions from group-linked batches
- **Group owners:** See all member distributions from their groups
- **Edit access:** Only the distributing member can update overwintering and hybridisation status for a tracker row
- **Read-only state:** Group owners can view member records that they do not own, but those rows render as read-only in the tracker UI

## 5. UI Structure

### Filters
- Group
- Year
- Status (`All`, `Pending mating`, `Mated`, `Overwintered`, `Failed`)

### Summary Cards
- Tracked queens
- Mated
- Overwintered
- Failed
- Hybridised

### Queen Record Layout
Each tracked queen now renders as a responsive record with:
- **Header:** Type, lifecycle state, group, queen label, marking colour, and latest weight summary
- **Queen Record panel:** Cell number, marking colour, age, latest weight, current graft stage, and stage date
- **Breeding Context panel:** Batch, breeder, mother queen, mother marking, mother age, graft date, emergence date, and source mating apiary
- **Destination panel:** Recipient, contact details, recipient apiary or hive, recorded location, distribution date, and notes
- **Outcomes panel:** Mated state, overwintered toggle, hybridised toggle, and hybridisation date input when relevant
- **Footer strip:** Quick recap of distribution date, location, and primary contact fields

On mobile, each record collapses behind an expand button to keep the list usable.
Read-only records show a badge and a short explanation inside the Outcomes panel.

## 6. Outcome Logic

### Mated
A record is considered mated when either:
- `mating_confirmed = true`, or
- `distribution_type = 'mated_queen'`

### Overwintered
- Three-state toggle: unknown, yes, no
- Date is stored automatically in `overwintered_date` when set to yes or no, using the local calendar date
- Date is cleared when reset to unknown
- A write is only treated as successful when Supabase returns the updated row

### Hybridised
- Three-state toggle: unknown, yes, no
- When set to yes, `hybridisation_date` is stored and remains editable from the tracker
- When reset to no or unknown, the hybridisation date is cleared
- Hybridisation date edits use the same per-row in-flight guard as the toggle path
- A write is only treated as successful when Supabase returns the updated row

## 7. Risks And Constraints
- The tracker intentionally avoids joining directly to recipient queen records because the current schema does not provide a guaranteed direct link from a tracker row to a specific queen row.
- The richer layout depends on optional fields that may be empty, so the UI uses explicit fallbacks instead of leaving gaps.
- The tracker remains distribution-led under the hood even though the presentation is queen-led.
- Visibility and editability are intentionally different: group owners may see more rows than they are allowed to edit under current RLS rules.

## 8. Files Modified
- `src/hooks/useQueenTracker.ts`
- `src/components/batches/QueenTrackerTab.tsx`
- `docs/features/queen-tracker.md`
