# Colony Tracking System Migration Guide

## Overview

This migration adds proper colony tracking to HiveCraic, separating **biological colonies** from **physical hive equipment**. This solves the problem of losing historical context when colonies are moved between hives.

## Problem Statement

**Before Migration:**
- Records (inspections, treatments, etc.) are linked only to `hive_id`
- When you move a colony from Hive A to Hive B, you lose the connection to historical records
- No way to view "all records for THIS colony" across multiple hives
- Colony lineage (splits, combines) cannot be tracked

**After Migration:**
- Each colony gets a unique ID that follows it across hive moves
- Records are linked to both `hive_id` (where the record was made) AND `colony_id` (which colony)
- Can view complete colony history regardless of which hive it was in
- Can track colony lineage (parent colonies, splits, combines)

## Migration Steps

### Step 1: Run Schema Migration

This creates the new tables and adds colony tracking columns.

**In Supabase SQL Editor:**

```sql
-- Copy and paste the contents of:
migrations/create_colony_tracking.sql
```

**What this creates:**
- `colonies` table - Stores colony information
- `colony_movements` table - Tracks colony movements between hives
- Adds `colony_id` column to:
  - `hives`
  - `inspections`
  - `varroa_checks`
  - `varroa_treatments`
  - `feedings`
  - `harvests`
- Creates automatic triggers to log movements and sync colony_id

### Step 2: Run Data Migration

This creates colony records for all existing hives and backfills historical data.

**In Supabase SQL Editor:**

```sql
-- Copy and paste the contents of:
migrations/migrate_existing_colonies.sql
```

**What this does:**
1. Creates a colony for each active hive (using colony number "COL-{hive_number}")
2. Links each hive to its new colony via `colony_id`
3. Backfills `colony_id` on all historical records
4. Creates initial movement records
5. Provides verification summary

### Step 3: Verify Migration

**Check that colonies were created:**

```sql
SELECT
  c.colony_number,
  c.origin_type,
  c.status,
  h.hive_number as current_hive,
  a.name as apiary
FROM colonies c
LEFT JOIN hives h ON h.colony_id = c.id
LEFT JOIN apiaries a ON h.apiary_id = a.id
ORDER BY c.created_at;
```

**Check that records were backfilled:**

```sql
-- Should return 0 rows (all records should have colony_id)
SELECT 'Inspections without colony' as type, COUNT(*) as count
FROM inspections WHERE colony_id IS NULL
UNION ALL
SELECT 'Treatments without colony', COUNT(*)
FROM varroa_treatments WHERE colony_id IS NULL
UNION ALL
SELECT 'Checks without colony', COUNT(*)
FROM varroa_checks WHERE colony_id IS NULL
UNION ALL
SELECT 'Feedings without colony', COUNT(*)
FROM feedings WHERE colony_id IS NULL
UNION ALL
SELECT 'Harvests without colony', COUNT(*)
FROM harvests WHERE colony_id IS NULL;
```

### Step 4: Update Frontend Code

The frontend code updates are being implemented to support colony tracking. Key changes:

1. **Hives Page** - Show colony information, allow colony assignment
2. **Records Page** - Filter by colony, show colony history across hives
3. **New Colony Management Page** - Create, edit, view colonies
4. **Colony Movement Logging** - Log when colonies move between hives

## How Colony Tracking Works

### Creating a New Colony

When you add a new hive with a colony:

```typescript
// 1. Create the colony
const { data: colony } = await supabase
  .from('colonies')
  .insert({
    colony_number: 'COL-2025-001',
    origin_type: 'purchased',
    origin_date: '2025-11-06',
    status: 'active'
  })
  .select()
  .single()

// 2. Assign to hive
await supabase
  .from('hives')
  .update({ colony_id: colony.id })
  .eq('id', hive_id)
```

### Moving a Colony Between Hives

When you move a colony from Hive A to Hive B:

```typescript
// 1. Remove colony from old hive
await supabase
  .from('hives')
  .update({ colony_id: null })
  .eq('id', old_hive_id)

// 2. Assign colony to new hive
await supabase
  .from('hives')
  .update({ colony_id: colony_id })
  .eq('id', new_hive_id)

// Triggers automatically:
// - Log movement in colony_movements table
// - Future records will get the colony_id
```

### Viewing Colony History

View all records for a colony across all hives:

```typescript
const { data: inspections } = await supabase
  .from('inspections')
  .select(`
    *,
    hives(hive_number, apiaries(name))
  `)
  .eq('colony_id', colony_id)
  .order('inspection_date', { ascending: false })
```

This returns records from ALL hives that ever housed this colony.

### Tracking Splits

When you split a colony:

```typescript
// 1. Create the new (daughter) colony
const { data: daughterColony } = await supabase
  .from('colonies')
  .insert({
    colony_number: 'COL-2025-002',
    origin_type: 'split',
    origin_date: '2025-11-06',
    parent_colony_id: parent_colony_id,  // Reference to parent
    status: 'active'
  })
  .select()
  .single()

// 2. Assign to new hive
await supabase
  .from('hives')
  .update({ colony_id: daughterColony.id })
  .eq('id', new_hive_id)

// 3. Log the split movement
await supabase
  .from('colony_movements')
  .insert({
    colony_id: daughterColony.id,
    to_hive_id: new_hive_id,
    movement_date: '2025-11-06',
    movement_type: 'split_to',
    notes: 'Split from parent colony'
  })
```

### Tracking Combines

When you combine two colonies:

```typescript
// 1. Create the combined colony
const { data: combinedColony } = await supabase
  .from('colonies')
  .insert({
    colony_number: 'COL-2025-003',
    origin_type: 'combine',
    origin_date: '2025-11-06',
    parent_colony_id: colony_a_id,
    secondary_parent_colony_id: colony_b_id,
    status: 'active'
  })
  .select()
  .single()

// 2. Mark old colonies as combined
await supabase
  .from('colonies')
  .update({
    status: 'combined',
    status_date: '2025-11-06'
  })
  .in('id', [colony_a_id, colony_b_id])

// 3. Assign combined colony to hive
await supabase
  .from('hives')
  .update({ colony_id: combinedColony.id })
  .eq('id', target_hive_id)
```

## Database Schema

### colonies Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| colony_number | TEXT | Unique colony identifier (e.g., "COL-2025-001") |
| user_id | UUID | Owner |
| origin_type | TEXT | How colony was acquired |
| origin_date | DATE | When colony was established |
| parent_colony_id | UUID | Parent colony (for splits) |
| secondary_parent_colony_id | UUID | Second parent (for combines) |
| status | TEXT | Current status |
| status_date | DATE | When status changed |
| status_reason | TEXT | Why status changed |
| notes | TEXT | General notes |

**Origin Types:**
- `purchased` - Bought from supplier
- `split` - Split from another colony
- `swarm` - Natural swarm from owned colony
- `caught_swarm` - Caught wild swarm
- `nuc` - Purchased nucleus
- `package` - Package bees
- `combine` - Combined from multiple colonies
- `other` - Other source

**Status Values:**
- `active` - Currently active
- `deceased` - Colony died
- `swarmed` - Swarmed away
- `combined` - Combined into another colony
- `sold` - Sold to someone else
- `given_away` - Given away

### colony_movements Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| colony_id | UUID | Which colony moved |
| user_id | UUID | Owner |
| from_hive_id | UUID | Source hive (NULL for new) |
| to_hive_id | UUID | Destination hive (NULL for removed) |
| movement_date | DATE | When moved |
| movement_type | TEXT | Type of movement |
| notes | TEXT | Context |

**Movement Types:**
- `full_move` - Full colony moved to different hive
- `split_from` - This is the source colony of a split
- `split_to` - This is the daughter colony from a split
- `combine` - Colony combined with another
- `new_colony` - New colony placement
- `removed` - Colony removed from hive

## Benefits

✅ **Track colony history** - View all records for a colony across hives
✅ **Proper lineage tracking** - Know which colonies came from which parents
✅ **Accurate record keeping** - Records stay with the correct biological colony
✅ **Better decision making** - Evaluate colony performance over time
✅ **Equipment reuse** - Reuse hive numbers without losing context
✅ **Split/combine tracking** - Proper genealogy of your colonies

## Best Practices

### Colony Numbering

Use a consistent numbering scheme:
- `COL-2025-001`, `COL-2025-002`, etc. (year-based)
- `COL-A`, `COL-B`, etc. (simple letters)
- `MC-001` (Mother Colony), `S1-001` (Split 1), etc. (descriptive prefixes)

### When to Create New Colonies

Create a new colony record when:
- ✅ Purchasing a new colony
- ✅ Catching a swarm
- ✅ Making a split (daughter colony)
- ✅ Combining colonies (new combined colony)
- ✅ Receiving a nuc or package

DO NOT create a new colony when:
- ❌ Moving existing colony to different hive
- ❌ Replacing equipment
- ❌ Changing queen (same colony, different genetics)

### Recording Movements

Always log movements when:
- Moving a colony from one hive to another
- Splitting a colony
- Combining colonies
- Removing a colony from a hive

This maintains the historical record and helps track colony locations over time.

## Troubleshooting

### Records Without colony_id

If you find records without `colony_id`:

```sql
-- Check which hives have records without colony_id
SELECT
  h.hive_number,
  h.status,
  (SELECT COUNT(*) FROM inspections WHERE hive_id = h.id AND colony_id IS NULL) as orphan_inspections
FROM hives h
WHERE EXISTS (
  SELECT 1 FROM inspections WHERE hive_id = h.id AND colony_id IS NULL
);
```

These are usually from:
1. Inactive hives
2. Hives without an assigned colony
3. Records created before migration

**To fix:** Assign a colony to the hive, then run:

```sql
UPDATE inspections
SET colony_id = (SELECT colony_id FROM hives WHERE id = inspections.hive_id)
WHERE colony_id IS NULL
  AND hive_id IN (SELECT id FROM hives WHERE colony_id IS NOT NULL);
```

### Duplicate Colony Numbers

If you get a "duplicate colony_number" error:

```sql
-- Find duplicates
SELECT colony_number, COUNT(*)
FROM colonies
GROUP BY colony_number
HAVING COUNT(*) > 1;
```

Rename one of them:

```sql
UPDATE colonies
SET colony_number = 'COL-NEW-001'
WHERE id = '[specific-id]';
```

## Rollback (Emergency Only)

If you need to rollback the migration:

```sql
-- Drop triggers
DROP TRIGGER IF EXISTS hive_colony_movement_trigger ON hives;
DROP TRIGGER IF EXISTS sync_hive_record_colony_trigger ON hives;

-- Drop functions
DROP FUNCTION IF EXISTS log_colony_movement CASCADE;
DROP FUNCTION IF EXISTS sync_record_colony_id CASCADE;

-- Drop tables
DROP TABLE IF EXISTS colony_movements CASCADE;
DROP TABLE IF EXISTS colonies CASCADE;

-- Remove columns
ALTER TABLE hives DROP COLUMN IF EXISTS colony_id;
ALTER TABLE inspections DROP COLUMN IF EXISTS colony_id;
ALTER TABLE varroa_checks DROP COLUMN IF EXISTS colony_id;
ALTER TABLE varroa_treatments DROP COLUMN IF EXISTS colony_id;
ALTER TABLE feedings DROP COLUMN IF EXISTS colony_id;
ALTER TABLE harvests DROP COLUMN IF EXISTS colony_id;
```

## Support

If you encounter issues during migration:
1. Check Supabase logs for errors
2. Run verification queries to identify problems
3. Review the troubleshooting section above
4. Check that RLS policies are correctly set up

## Next Steps

After completing the migration:
1. ✅ Test creating a new colony
2. ✅ Test moving a colony between hives
3. ✅ Test viewing colony history in records page
4. ✅ Test creating a split
5. ✅ Test combining colonies
6. ✅ Update user documentation
