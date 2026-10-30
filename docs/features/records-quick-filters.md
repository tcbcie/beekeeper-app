# Feature: Records Quick Filters

**Date:** 30 October 2026 · **Status:** Implemented

## Overview

Records opens on one hive's inspections, with buttons to switch record type: Inspections, Feeding, Varroa check, Varroa treatment, Harvest (`src/components/records/RecordFiltersBar.tsx`). They use the same icons and colours as the hive page's quick actions, smaller, with a ring marking the selected one. The drop-downs stay in the Filters panel for everything else, such as All Hives, All Types and Hive Archived. When one of those is chosen, no button is lit.

## Defaults (owner's decisions, 30 October 2026)

Every opening of Records, unless a link names a place, starts on:

- My Records, Inspections, archived hives hidden. These last for the visit and are no longer remembered (`useRecordFilters`).
- The apiary and hive remembered today (see below). With nothing remembered, the first apiary in the drop-down that is the user's own and has an active hive, and its first active hive.

The time period is still remembered. The apiary and hive selection is shared with Hives, Tasks and Reports, so opening Records changes what those pages show. The owner accepted this.

Clear filters forgets the remembered place and returns to these defaults, and the Filters badge counts differences from them. Changing the apiary selects its first hive. Choosing Team or All Records clears the apiary and hive, as the defaults are the user's own. An empty list names the hive and offers "Show all hives".

## Remembered apiary and hive (owner's decision, 30 October 2026)

Records remembers one place, the apiary and hive being worked on, until the end of the day (`workPlace` in `src/app/dashboard/records/page.tsx`, stored as `records:work-place`). Sign-out clears it with the other saved filters. A place from an earlier day, or whose hive has gone or been archived, counts as nothing remembered.

| Remembered when the user | Value |
|---|---|
| Saves a new record | That record's hive and its apiary. Editing an old record remembers nothing |
| Chooses a hive under Filters | That hive and its apiary |
| Chooses an apiary under Filters | That apiary, no hive |
| Follows a hive link, unless it opens one old record | That hive and its apiary |
| Follows a New Record link naming an apiary | That apiary, and the remembered hive if it is in that apiary |
| Follows a link to an apiary's records | That apiary, no hive |

Picking an apiary on the Hives page, or a hive on Tasks or Reports, does not set it. A remembered team-mate's hive or team apiary switches My Records to All Records, or its records would not show.

## New records

- New Record starts the form on the remembered hive and its apiary, so an inspection, Varroa check, treatment and feeding on one hive need no re-selecting. Archiving a hive is never pre-filled.
- A hive selected automatically never pre-fills a new record. Only a hive the user chose does (`autoHiveId`, `formHiveId`).
- Opening a new record switches the list to that record type, and to all hives in the apiary if the hive was automatic. Saving moves the list to the saved hive and its apiary, so the record is always visible.
- To move to the next hive, change the hive in the form. A record saved without changing it goes against the remembered hive.

## Links

| Link | Opens |
|---|---|
| `?hive=X` | That hive and its apiary, all record types |
| `?hive=X&type=T` | A new record for that hive |
| `?hive=X&type=T&record=ID` or `?type=T&record=ID` | The list with that record highlighted |
| `?create=T&apiary=Y` | A new record, with that apiary, and the remembered hive if it is in that apiary |
| `?create=T` | A new record, with the remembered apiary and hive, or else the default apiary and no hive chosen |
| `?apiary=Y` | That apiary, all hives, all record types |

Links now reset any apiary or hive left over from an earlier visit, which could otherwise have hidden the record being opened.

## Search

While there is search text, the apiary and hive filters are ignored, so a known record can be found from any hive. The record type filter and time period still apply.

## Database

No change.
