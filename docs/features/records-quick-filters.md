# Feature: Records Quick Filters

**Date:** 30 October 2026 · **Status:** Implemented

## Overview

Records opens on one hive's inspections, with buttons to switch record type: Inspections, Feeding, Varroa check, Varroa treatment, Harvest (`src/components/records/RecordFiltersBar.tsx`). The drop-downs stay in the Filters panel for everything else, such as All Hives, All Types and Hive Archived. When one of those is chosen, no button is lit.

## Defaults (owner's decisions, 30 October 2026)

Every opening of Records, unless a link names a place, starts on:

- My Records, Inspections, archived hives hidden. These last for the visit and are no longer remembered (`useRecordFilters`).
- The first apiary in the drop-down that is the user's own and has an active hive, and its first active hive.

The time period is still remembered. The apiary and hive selection is shared with Hives, Tasks and Reports, so opening Records changes what those pages show. The owner accepted this.

Clear filters returns to these defaults, and the Filters badge counts differences from them. Changing the apiary selects its first hive. Choosing Team or All Records clears the apiary and hive, as the defaults are the user's own. An empty list names the hive and offers "Show all hives".

## New records

- A hive selected automatically never pre-fills a new record. Only a hive the user chose does (`autoHiveId`, `formHiveId` in `src/app/dashboard/records/page.tsx`).
- Opening a new record switches the list to that record type, and to all hives in the apiary if the hive was automatic, so the saved record appears in the list. A record saved in a different apiary is still outside the list until the apiary changes.

## Links

| Link | Opens |
|---|---|
| `?hive=X` | That hive and its apiary, all record types |
| `?hive=X&type=T` | A new record for that hive |
| `?hive=X&type=T&record=ID` or `?type=T&record=ID` | The list with that record highlighted |
| `?create=T&apiary=Y` | A new record, with that apiary and all its hives |
| `?create=T` | A new record, with the default apiary and no hive chosen |
| `?apiary=Y` | That apiary, all hives, all record types |

Links now reset any apiary or hive left over from an earlier visit, which could otherwise have hidden the record being opened.

## Search

While there is search text, the apiary and hive filters are ignored, so a known record can be found from any hive. The record type filter and time period still apply.

## Database

No change.
