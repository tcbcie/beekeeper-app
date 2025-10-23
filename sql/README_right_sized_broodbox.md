# Right-Sized Broodbox Data Structure

## Overview
The `right_sized_broodbox` feature allows tracking whether a hive uses a right-sized broodbox configuration. When enabled, inspections can record the number of right-sized frames.

## Data Storage Location

**IMPORTANT:** The `right_sized_broodbox` value is stored **ONLY** in the `configuration` JSONB column of the `hives` table.

### Correct Structure
```json
{
  "hive_number": "H001",
  "configuration": {
    "brood_boxes": 2,
    "honey_supers": 1,
    "queen_excluder": true,
    "feeder": false,
    "feeder_type": "",
    "entrance_reducer": false,
    "varroa_mesh_floor": "closed",
    "right_sized_broodbox": true  // ← Stored here in JSONB
  }
}
```

### ❌ INCORRECT: Standalone Column
Do NOT use a standalone `right_sized_broodbox` column on the hives table. This causes data inconsistency.

## Migration History

1. **Initial (Incorrect) Approach:** Created a standalone column (see `add_right_sized_broodbox_to_hives.sql` - now obsolete)
2. **Fix:** Migrated to configuration JSONB only (see `fix_right_sized_broodbox_consistency.sql`)

## How to Enable/Disable

### Via UI
1. Go to Hives page
2. Edit a hive
3. Click the "Right-Sized Broodbox" toggle button
4. Save the hive

### Via SQL
```sql
-- Enable for a specific hive
UPDATE hives
SET configuration = jsonb_set(
  COALESCE(configuration, '{}'::jsonb),
  '{right_sized_broodbox}',
  'true'::jsonb
)
WHERE hive_number = 'H001';

-- Disable for a specific hive
UPDATE hives
SET configuration = jsonb_set(
  COALESCE(configuration, '{}'::jsonb),
  '{right_sized_broodbox}',
  'false'::jsonb
)
WHERE hive_number = 'H001';
```

## How It's Used in the Application

### Hives Page
- Displays toggle button in hive configuration section
- Saves to `configuration.right_sized_broodbox` when hive is updated
- Shows average right-sized frames in hive tile cards (when enabled)

### Inspections Page
- Conditionally shows "Right-Sized to How Many Frames" field
- Only appears when selected hive has `configuration.right_sized_broodbox === true`
- Saves count to `inspections.right_sized_frames` column

## Database Schema

### Hives Table
```sql
CREATE TABLE hives (
  id UUID PRIMARY KEY,
  hive_number VARCHAR,
  configuration JSONB,  -- Contains right_sized_broodbox
  ...
);
```

### Inspections Table
```sql
CREATE TABLE inspections (
  id UUID PRIMARY KEY,
  hive_id UUID REFERENCES hives(id),
  right_sized_frames INTEGER,  -- Number of right-sized frames (1-10)
  ...
);
```

## Troubleshooting

### Issue: Feature not working after toggle
**Problem:** Toggling right_sized_broodbox in UI doesn't affect inspections form.

**Solution:**
1. Check that you clicked "Update Hive" after toggling
2. Run this query to verify the value in database:
```sql
SELECT
  hive_number,
  configuration->>'right_sized_broodbox' as enabled
FROM hives;
```

### Issue: Data in both column and JSONB
**Problem:** Some hives have `right_sized_broodbox` as both a column and in configuration.

**Solution:**
1. Run `fix_right_sized_broodbox_consistency.sql`
2. This will migrate column data to JSONB and remove the column

## Related Files

- `/src/app/dashboard/hives/page.tsx` - Hive management with toggle
- `/src/app/dashboard/inspections/page.tsx` - Conditional right-sized frames field
- `/sql/fix_right_sized_broodbox_consistency.sql` - Migration script
- `/sql/toggle_right_sized_broodbox.sql` - Helper script for manual toggling
