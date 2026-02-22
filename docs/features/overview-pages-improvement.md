# Overview Pages Improvement Plan

## Date: 2026-02-13

## Summary
A thorough audit of all overview/listing pages in HiveCraic, comparing current layouts against available functionality and data. This document proposes targeted, simple improvements to make the overview pages more useful and informative for beekeepers.

---

## Audit Findings

### 1. Dashboard Overview (`/dashboard`)

**Current Layout (top to bottom):**
1. Header: "Dashboard Overview" + admin badge + ticket status
2. "My Beekeeping" - 3 stat cards (Apiaries, Hives, Inspections 7d)
3. "Shared by Me" section (conditional) - 4 mini stats
4. "Shared with Me" section (conditional) - 4 mini stats
5. Upcoming Events component (next 7 days)
6. Recent Activity - 5 most recent records (non-clickable)
7. Teams section - owned/member teams
8. App version footer card

**Issues Found:**
| Issue | Severity | Detail |
|-------|----------|--------|
| Missing queen stats | Medium | Queens are a core entity but not on dashboard |
| Missing active tasks count | Medium | Tasks exist but no count shown |
| Recent Activity not clickable | High | Items show data but don't link to the actual record |
| No quick actions | High | No shortcuts to common tasks (New Inspection, Log Feeding) |
| No "attention needed" alerts | High | No indicators for overdue inspections, old queens, high varroa |
| Version footer wastes space | Low | Takes up a full card for rarely-needed info |
| Teams section always visible | Low | Doesn't change often, takes permanent real estate |

**Data Available but Unused:**
- Queen count (active/total)
- Active tasks/events count
- Varroa check results (last infestation rates)
- Days since last inspection per hive
- Queen ages (replacement warnings)
- Harvest totals (season summary)

---

### 2. Apiaries Page (`/dashboard/apiaries`)

**Current Layout:**
- Header with "Add Apiary" button
- Expandable inline form (very long with map picker, geocoding, image upload)
- 2-column grid of apiary cards showing: name, location, city, eircode, coordinates, share status, image, edit/delete

**Issues Found:**
| Issue | Severity | Detail |
|-------|----------|--------|
| No hive count per apiary | High | Can't see at a glance how many hives each apiary has |
| No summary stats at top | Medium | No total counts or overview metrics |
| Coordinates shown by default | Low | GPS coords clutter the card - rarely useful at a glance |
| No search/filter | Medium | Can't search or sort apiaries |
| No "last visited" indicator | Medium | No sense of when you were last at each apiary |

**Data Available but Unused:**
- Hive count per apiary (via hives.apiary_id)
- Last inspection date at each apiary
- Active hive vs archived hive count per apiary

---

### 3. Hives Page (`/dashboard/hives`)

**Current Layout:**
- Filter by apiary, ownership, archive status
- Expandable inline form
- 2-column grid of hive cards showing: number, apiary, queen info, status, configuration, notes, last record, tasks

**Issues Found:**
| Issue | Severity | Detail |
|-------|----------|--------|
| No summary stats bar | Medium | No active/archived totals shown |
| No "days since inspection" | High | Can't tell which hives are overdue for inspection |
| No sort options | Medium | Can't sort by last inspected, hive number, etc. |
| No visual health indicator | Medium | No quick-glance colour coding for hive status |
| Dense card information | Low | Configuration details could be collapsed |

**Data Available but Unused:**
- Days since last inspection (calculable from records)
- Varroa status (last check result)
- Queen age indicator
- Weight trend (if scale connected)

---

### 4. Queens Page (`/dashboard/queens`)

**Current Layout:**
- Search bar + ownership filter
- Expandable inline form
- List of queen cards with lineage tree modal

**Issues Found:**
| Issue | Severity | Detail |
|-------|----------|--------|
| No summary stats | Medium | No active/retired counts, no average age |
| No age warning | High | Queens over 2 years should be highlighted for replacement |
| No assigned/unassigned filter | Medium | Can't quickly see which queens are unassigned |
| No performance ranking | Low | No visual comparison of queen performance |

**Data Available but Unused:**
- Age calculation (birth_date exists, age display exists in cards but no summary)
- Performance notes aggregation
- Assigned vs unassigned status

---

### 5. Records Page (`/dashboard/records`)

**Current Layout:**
- Header with "New Record" dropdown
- Filter bar (apiary, hive, type, time period, ownership)
- Chronological list of record cards (colour-coded by type)

**Issues Found:**
| Issue | Severity | Detail |
|-------|----------|--------|
| No summary stats at top | Medium | No counts by record type for the filtered period |
| No inspection gap warnings | Medium | Could highlight hives not inspected recently |

**Generally well-structured** - this page has good filtering and the card system works well.

---

### 6. Batches Page (`/dashboard/batches`)

**Current Layout:**
- 3 tabs: Planning, Mating Nucs, Selection
- Planning: batch list with timeline
- Selection: weighted scoring of hives

**Issues Found:**
- Generally well-structured with tabs
- Timeline tracking works well
- Selection algorithm is useful

**No major changes proposed.**

---

## Proposed Improvements

### Phase 1: Dashboard Overview (Highest Impact)

#### 1a. Add missing stat cards
- Add "My Queens" stat card (active queen count, links to `/dashboard/queens`)
- Add "Active Tasks" stat card (incomplete tasks count, links to `/dashboard/tasks`)
- Change grid to accommodate 5 cards: `grid-cols-2 md:grid-cols-3 lg:grid-cols-5`

#### 1b. Add Quick Actions bar
- Add a row of quick action buttons below stat cards:
  - "New Inspection" -> opens records page with inspection form
  - "Log Feeding" -> opens records page with feeding form
  - "Add Treatment" -> opens records page with treatment form
  - "New Task" -> opens tasks page with form
- Simple pill/chip buttons in a flex-wrap row

#### 1c. Add "Attention Needed" section
- Show between stat cards and upcoming events
- Query for:
  - Hives not inspected in 14+ days (configurable)
  - Queens over 2 years old
  - Latest varroa check above threshold (3%+)
- Show as a yellow/amber alert card with count + link
- Only shows when there are items needing attention

#### 1d. Make Recent Activity clickable
- Each activity item links to the records page filtered for that hive
- Add a "View All" link at the bottom -> `/dashboard/records`

#### 1e. Compact version footer
- Replace full card with a small inline text at the very bottom:
  "HiveCraic v1.5.19 | Updated Feb 9, 2026 | View Changes"

---

### Phase 2: Apiaries Page

#### 2a. Add hive count to each apiary card
- Query hive count grouped by apiary_id
- Display "X hives" badge on each apiary card
- Simple count query, minimal code change

#### 2b. Add summary stats bar
- Small bar at top: "X Apiaries | Y Total Hives"
- Single line, not a full card - just descriptive text

#### 2c. Add last inspection date per apiary
- Show "Last inspected: DD/MM/YYYY" or "X days ago" on each card
- Query most recent inspection_date for hives in each apiary

---

### Phase 3: Hives Page

#### 3a. Add summary stats bar
- Show: "X Active | Y Archived | Z Need Inspection (14+ days)"
- Simple counts, displayed as a single line above the filter bar

#### 3b. Add "days since inspection" to hive cards
- Display a small badge: "Inspected X days ago" or "No inspections"
- Colour-coded: green (< 7d), amber (7-14d), red (14+ days), grey (never)
- Uses existing `last_record` data already fetched

#### 3c. Add sort dropdown
- Options: Hive Number, Last Inspected, Apiary
- Simple client-side sort of existing data

---

### Phase 4: Queens Page

#### 4a. Add summary stats bar
- Show: "X Active | Y Retired | Avg Age: Z months"
- Simple calculation from existing queen data

#### 4b. Add age warning indicator on cards
- Show an amber/red badge on queens older than 2 years
- "Replace soon" or similar short text
- Simple date comparison

#### 4c. Add assigned/unassigned filter
- Add a toggle/filter: "All | Assigned | Unassigned"
- Based on whether queen has an entry in hives table

---

## Priority Order

1. **Phase 1b** - Quick Actions (immediate usability win)
2. **Phase 1c** - Attention Needed alerts (most valuable for beekeepers)
3. **Phase 1a** - Missing stat cards (quick data win)
4. **Phase 1d** - Clickable Recent Activity
5. **Phase 2a** - Hive count per apiary
6. **Phase 3b** - Days since inspection on hive cards
7. **Phase 4b** - Queen age warnings
8. **Phase 3a** - Hive summary stats
9. **Phase 2b** - Apiary summary stats
10. **Phase 4a** - Queen summary stats
11. **Phase 2c** - Last inspection per apiary
12. **Phase 3c** - Hive sort dropdown
13. **Phase 4c** - Queen assigned/unassigned filter
14. **Phase 1e** - Compact version footer

---

## Implementation Notes

- All changes should be **minimal and surgical** - no major refactors
- Reuse existing components (StatCard, EmptyState, etc.)
- Keep existing data fetching patterns (parallel Promise.all queries)
- All new queries should respect RLS (filter by user_id)
- Maintain mobile-first responsive design
- Test dark mode compatibility for any new elements
