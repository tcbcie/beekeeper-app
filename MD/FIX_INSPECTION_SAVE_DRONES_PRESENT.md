# Fix: Hive Inspection Save Failure

## Problem
Users could not save hive inspections. The save operation failed with a 400 Bad Request error.

## Root Cause
**PostgreSQL CHECK constraint violation (Error 23514)**

The error message:
```
"new row for relation \"inspections\" violates check constraint \"inspections_drones_present_check\""
```

The frontend was initializing `drones_present` to `-1` as a sentinel value meaning "not recorded", but the database has a CHECK constraint that requires `drones_present >= 0`.

## Investigation Steps
1. Confirmed `inspection_date` was the only required field
2. Tested direct INSERT via SQL - worked perfectly
3. Analyzed browser Network tab - found error code 23514
4. Identified the CHECK constraint violation on `drones_present`
5. Found frontend was using `-1` as default value

## Solution
Convert `drones_present` from `-1` to `null` before submitting to the database, while keeping the UI logic unchanged.

### Files Modified
**src/app/dashboard/records/page.tsx**

**Updated submitData (line 1240)**
   ```typescript
   // Before
   drones_present: formData.drones_present,

   // After
   drones_present: formData.drones_present === -1 ? null : formData.drones_present,
   ```

This single line change:
- Keeps the UI using `-1` as a sentinel value (for the slider and display logic)
- Converts `-1` to `null` when submitting to the database
- Prevents the CHECK constraint violation

## Why This Works
1. **Database compatibility**: Converts `-1` to `null` before INSERT/UPDATE, satisfying the constraint
2. **UI unchanged**: The slider, form state, and display logic continue to use `-1` as expected
3. **Minimal change**: Only one line modified, reducing risk of breaking existing functionality
4. **Type safe**: No TypeScript errors since FormData keeps `drones_present: number`

## Testing
After the fix, users should be able to:
- Save new hive inspections
- Save inspections without recording drone presence
- Edit existing inspections
- View inspections with and without drone data

## Related Files
- Database constraint: `inspections_drones_present_check` in `public.inspections` table
- Frontend form: `src/app/dashboard/records/page.tsx`
- Display logic: Same file, inspection details view

## Date Fixed
9 November 2025
