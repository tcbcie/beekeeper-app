# Feature: Queen Tracker
**Date:** 31/03/2026
**Status:** Implemented

## 1. Overview
The Queen Tracker is the `Queen Tracker` tab on the Queen Rearing page (`/dashboard/batches`). It follows queens distributed from visible rearing-group batches and from the current user's non-group batches, and presents each one as a fuller queen record rather than a narrow distribution row.

The tracker now combines:
- Queen identity context such as cell number, queen tagged number, marking state, recorded marking colour where marked, age, and latest weight
- Breeding provenance such as batch, breeder, mother queen, mother marking and age, graft date, emergence date, and source mating apiary
- Destination context such as recipient, contact details, recipient apiary or hive, and recorded mating location
- Lifecycle outcomes such as direct mating confirmation, explicit queen failure, overwintering, and hybridisation status

## 2. Scope & Simplicity
* **In Scope:**
  - Track queen cell, virgin queen, and mated queen distributions from visible group-linked batches and from the current user's non-group batches
  - Surface the fuller set of existing queen, batch, breeder, recipient, and outcome details already available in the system
  - Present the tracker as a denser table-first ledger with expandable detail rows for fuller queen context
  - Provide dynamic `Group -> Member -> Batch` filtering, alongside the existing year and status filters
  - Keep the existing outcome update actions and add direct mating confirmation for `Pending Mating` ledger rows

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
The live schema was checked through the MCP server before implementation. An additional migration was applied to `public.graft_distributions` to add:
- `queen_failed`
- `queen_failed_date`
- `queen_failure_comment`

The tracker now uses broader joins and mapping over existing tables:
- `graft_distributions` for distribution and outcome fields
- `batch_grafts` for cell number, queen marking, and queen number
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
The latest mating-confirmation pass reuses the existing `graft_distributions.mating_confirmed`, `mating_confirmed_date`, and `mating_location` fields, so no schema change was needed for ledger-side mating updates.
The recent hardening pass also required a follow-up parse fix in `useQueenTracker` so the owned-row and owned-group query-builder path compiles cleanly.
The latest build-fix follow-up also corrects the typed `rearing_batches` nested join shape so the existing `firstJoinedRecord(...)` normalisation matches the raw Supabase payload and compiles cleanly.
The explicit queen-failure migration also backfilled historic ledger rows where `overwintered = false` into the new `queen_failed` state so previous tracker data keeps its earlier failure meaning.
The latest remediation pass narrows the ledger select payload to the fields the table actually uses, patches successful outcome writes into local hook state instead of refetching the full ledger, and uses dedicated failure-date and failure-comment updates guarded by the explicit failure state.
The filter hierarchy now uses safe derived selections for Group, Member, and Batch rather than repairing invalid selections in effects after render, and year parsing now uses the existing local-date helper for consistency.

## 4. Visibility Rules
- **Group members:** See their own distributions from group-linked batches
- **Group owners:** See all member distributions from their groups
- **Non-group batches:** See their own non-group ledger rows
- **Edit access:** Only the distributing member can update failure, overwintering, and hybridisation outcomes for a tracker row
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
- **Actions:** `Mated`, `Hybridised`, `Overwintered`, and `Failed` share one compact action column between `Queen` and `Status`, with centred labels over a denser control grid that reflows cleanly when `Mated` is absent, followed by the inline date-capture editor when the user records a date-bearing outcome
- **Status:** Distribution type and lifecycle state in a tighter, narrower column
- **Distribution:** Recipient name-first or email fallback, a compact distribution-type cue (`Group Member`, `App User`, or `Public Recipient`), and the distributed date on its own line beneath that cue

The summary row spacing between `Queen` and `Actions` has also been tightened so the identity and action area reads as one denser working block.

Read-only member rows now use a distinct row treatment instead of a dedicated `Read only` badge in the Status column.
Expanded rows now use a denser two-panel layout instead of four equal cards. A compact `Reference Context` panel carries the broader queen, breeding, batch, and distribution facts, while a wider `Outcomes` workspace keeps the editable failure date and comment, plus the editable outcome dates, together in one clear area.
Read-only records still show their restricted-edit explanation inside the expanded Outcomes panel.
Stage data is no longer surfaced in the Queen Ledger UI.

## 6. Outcome Logic

### Mated
A record is considered mated when either:
- `mating_confirmed = true`, or
- `distribution_type = 'mated_queen'`

For eligible `Pending Mating` rows, the row action area now provides a compact `Mated` control.
- Marking mating from the ledger now opens a compact inline date-capture editor inside the actions cell before saving
- Confirming mating from that editor writes to the same distribution record used by the batch distributions table
- The expanded `Outcomes` panel now includes an editable `Record mated date` field for confirmed non-`mated_queen` rows
- Clearing mating removes both the confirmation flag and the recorded mating date
- Batch-level `queens_mated` counts now only treat sold virgin-queen rows as mated once this confirmation exists

### Overwintered
- Three-state toggle: unknown, yes, no
- Setting an overwintering outcome now goes through the same inline date-capture editor before the first save
- Date is cleared when reset to unknown
- The overwintered date editor is user-controlled inside the expanded record, so members can correct historical outcome dates without widening the main table
- Overwintering edits are disabled while a queen is explicitly marked failed
- A write is only treated as successful when Supabase returns the updated row, and successful writes patch the local ledger row instead of triggering a full reload

### Hybridised
- Three-state toggle: unknown, yes, no
- Setting hybridisation now goes through the same inline date-capture editor before the first save
- When reset to no or unknown, the hybridisation date is cleared
- Hybridisation date edits use the same per-row in-flight guard as the toggle path
- The hybridisation date editor is controlled so failed writes revert to the persisted value, and cleared values no longer leave stale input state behind
- The hybridisation date is now written through its own guarded update path, so saving the date cannot silently recreate a hybridised state after a concurrent change
- Hybridisation edits are disabled while a queen is explicitly marked failed
- A write is only treated as successful when Supabase returns the updated row

### Failed
- Failure is now an explicit queen outcome rather than a derived alias of `overwintered = false`
- The row action area provides a compact `Failed` control alongside `Overwintered` and `Hybridised`
- Marking a queen as failed now goes through the same inline date-capture editor before the failure is saved
- Failure date and a short failure comment are edited in the expanded `Outcomes` panel
- Clearing the failure state clears the failure date and failure comment
- Failure date and comment writes now use dedicated guarded updates, so they cannot recreate a failed state after a concurrent clear
- Historic rows previously treated as failed through `overwintered = false` were backfilled into the explicit failure state during migration

### Winter Loss
- A row with `overwintered = false` but no explicit failure now shows `Winter loss` as its lifecycle state
- The `Failed` summary and filter use the explicit failure state, not winter loss

## 7. Risks And Constraints
- The tracker intentionally avoids joining directly to recipient queen records because the current schema does not provide a guaranteed direct link from a tracker row to a specific queen row.
- The richer layout depends on optional fields that may be empty, so the UI uses explicit fallbacks instead of leaving gaps.
- The tracker remains distribution-led under the hood even though the presentation is queen-led.
- Visibility and editability are intentionally different: group owners may see more rows than they are allowed to edit under current RLS rules.
- The failure outcome now has clearer semantics than overwintering, but older data still depends on the backfill migration to preserve prior tracker meaning.
- Distributed grafts intentionally remain `sold` after distribution; later mating confirmation changes the distribution outcome and batch mated counts rather than rewriting the graft lifecycle stage.

## 8. Files Modified
- `supabase` migration `add_queen_failure_fields_to_graft_distributions`
- `src/hooks/useQueenTracker.ts`
- `src/components/batches/QueenTrackerTab.tsx`
- `docs/features/queen-tracker.md`
