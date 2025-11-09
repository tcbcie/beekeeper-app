# Soft Delete Implementation Strategy

## Overview
Prevent accidental data loss by never actually deleting records - just mark them as deleted.

## Database Changes

### Add deleted_at column to critical tables:

```sql
-- Add soft delete columns to all critical tables
ALTER TABLE public.apiaries ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.hives ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.queens ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.inspections ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.beekeeping_associations ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX idx_apiaries_deleted_at ON public.apiaries(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_hives_deleted_at ON public.hives(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_queens_deleted_at ON public.queens(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_inspections_deleted_at ON public.inspections(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_deleted_at ON public.profiles(deleted_at) WHERE deleted_at IS NULL;
```

### Update RLS Policies to Filter Deleted Records:

```sql
-- Example for hives table
DROP POLICY IF EXISTS "Users can view their own hives" ON public.hives;
CREATE POLICY "Users can view their own hives" ON public.hives
  FOR SELECT
  USING (
    auth.uid() = user_id
    AND deleted_at IS NULL  -- Only show non-deleted records
  );
```

## Application Code Changes

### Create a Supabase Helper:

```typescript
// lib/supabase-helpers.ts

/**
 * Soft delete a record instead of hard deleting
 */
export async function softDelete(
  supabase: SupabaseClient,
  table: string,
  id: string
) {
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
  return { success: true };
}

/**
 * Query with soft delete filtering built in
 */
export function queryActive<T>(
  supabase: SupabaseClient,
  table: string
) {
  return supabase
    .from(table)
    .select('*')
    .is('deleted_at', null) as PostgrestFilterBuilder<T>;
}

/**
 * Restore a soft-deleted record
 */
export async function restore(
  supabase: SupabaseClient,
  table: string,
  id: string
) {
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: null })
    .eq('id', id);

  if (error) throw error;
  return { success: true };
}
```

### Update Delete Operations:

```typescript
// Instead of:
await supabase.from('hives').delete().eq('id', hiveId);

// Use:
await softDelete(supabase, 'hives', hiveId);
```

### Update Queries:

```typescript
// Instead of:
const { data } = await supabase.from('hives').select('*');

// Use:
const { data } = await supabase
  .from('hives')
  .select('*')
  .is('deleted_at', null);

// Or use the helper:
const query = queryActive(supabase, 'hives');
const { data } = await query;
```

## Benefits

1. **Accidental Deletion Recovery**: Can restore deleted records
2. **Audit Trail**: Know when records were deleted
3. **Cascade Protection**: Prevents CASCADE deletes from wiping everything
4. **User Mistake Recovery**: Users can "undo" deletes

## Admin Interface

Add a "Deleted Items" section in Settings where admins can:
- View all soft-deleted records
- Restore individual items
- Permanently delete old items (after 30 days)

## Cleanup Strategy

```typescript
// Permanent deletion after 30 days (run as cron job)
export async function permanentlyDeleteOldRecords(
  supabase: SupabaseClient,
  table: string,
  daysOld: number = 30
) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const { error } = await supabase
    .from(table)
    .delete()
    .not('deleted_at', 'is', null)
    .lt('deleted_at', cutoffDate.toISOString());

  if (error) throw error;
}
```
