# FIBKA Applied Skills Logbook

## Overview
Allows beekeepers to track their progress through the FIBKA (Federation of Irish Beekeepers' Associations) Applied Skills Logbook within the app. Skills are grouped by category, and each completed skill records the assessor details and date.

## Stage Support
Implements **Stage 2**, **Stage 3** and **Stage 4** Applied Skills. Additional stages can be added to `src/lib/logbook-skills.ts`.

## Skill Categories (Stage 2)
| Category | Skills |
|----------|--------|
| Honeybee Natural History | 16 |
| Honeybee Management | 13 |
| Honeybee Pests and Diseases | 17 |
| Honeybee Products and Forage | 5 |
| Manipulation of Honeybee Colonies | 15 |
| Equipment | 7 |
| Stings | 2 |
| **Total** | **75** |

## Skill Categories (Stage 3)
| Category | Skills |
|----------|--------|
| Natural History | 18 |
| Honeybee Forage | 5 |
| Manipulations and Equipment | 8 |
| Apiary and Honeybee Management | 7 |
| Practical Beekeeping | 11 |
| Hive Records | 15 |
| Swarming, Swarm Control and Effects | 5 |
| Honeybee Products | 11 |
| Selection and Breeding of Honeybees | 9 |
| Honeybee Health | 27 |
| **Total** | **116** |

## Skill Categories (Stage 4)
| Category | Skills |
|----------|--------|
| Natural History | 6 |
| Honeybee Behaviour | 9 |
| Honeybee Forage, Plants and Pollination | 8 |
| Apiary and Honeybee Management | 46 |
| Apiary and Equipment | 9 |
| Practical Beekeeping | 5 |
| Honeybee Products and Processing | 20 |
| Selection and Breeding of Honeybees | 9 |
| Honeybee Health | 23 |
| **Total** | **135** |

## Architecture
- **Skill definitions** are frontend constants in `src/lib/logbook-skills.ts` (not in the database). FIBKA skills are standardised and do not vary per user.
- **User completions** are stored in the `logbook_entries` database table, keyed by `user_id` + `skill_id`.
- **Skill IDs** follow the format `s2_nh_01` (stage, category abbreviation, number).

## Database
### Table: `logbook_entries`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK to auth.users |
| skill_id | TEXT | Matches constant skill ID |
| assessor_name | TEXT | Required |
| assessor_fibka_number | TEXT | Optional |
| completed_date | DATE | Required |
| notes | TEXT | Optional |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto |

**Constraints:** UNIQUE on (user_id, skill_id). RLS policies restrict all operations to the owning user.

## Key Files
| File | Purpose |
|------|---------|
| `src/app/dashboard/logbook/page.tsx` | Logbook page with accordion UI |
| `src/hooks/useLogbook.ts` | Data hook (fetch, save, delete) |
| `src/lib/logbook-skills.ts` | Stage 2, 3 & 4 skill constants |
| `src/types/logbook.ts` | TypeScript types |

## UI
- **Progress bar** showing overall completion percentage
- **Accordion categories** that expand/collapse, each with a completion badge (e.g. "5/16")
- **Inline form** for marking a skill complete with assessor name, FIBKA number, date, and optional notes
- **Remove button** to delete a completion
- Mobile-responsive design

## Navigation
Listed under the **Activity** group in the sidebar as "Logbook" with the BookOpen icon.

## Adding New Stages
1. Add a new stage object to `LOGBOOK_STAGES` in `src/lib/logbook-skills.ts`
2. Use a unique stage prefix for skill IDs (e.g. `s3_` for Stage 3)
3. The page already supports stage selection via `selectedStageId` state
