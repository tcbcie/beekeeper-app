# Database Operation Safeguards

## 1. Disable TRUNCATE/CASCADE Operations

```sql
-- Create a function that prevents TRUNCATE
CREATE OR REPLACE FUNCTION prevent_truncate()
RETURNS event_trigger AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands() LOOP
    IF obj.command_tag = 'TRUNCATE TABLE' THEN
      RAISE EXCEPTION 'TRUNCATE is disabled. Use soft deletes instead.';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create event trigger
CREATE EVENT TRIGGER no_truncate_trigger
  ON ddl_command_end
  WHEN TAG IN ('TRUNCATE TABLE')
  EXECUTE FUNCTION prevent_truncate();
```

## 2. Require Confirmation for Bulk Deletes

```typescript
// lib/safe-operations.ts

/**
 * Safe bulk delete with confirmation and limits
 */
export async function safeBulkDelete(
  supabase: SupabaseClient,
  table: string,
  ids: string[]
) {
  // Limit: No more than 100 records at once
  if (ids.length > 100) {
    throw new Error(
      `Bulk delete limited to 100 records. You tried to delete ${ids.length}.`
    )
  }

  // Require explicit confirmation for more than 10 records
  if (ids.length > 10) {
    const confirmed = confirm(
      `⚠️ WARNING: You are about to delete ${ids.length} records.\n\n` +
      `This action cannot be easily undone.\n\n` +
      `Are you absolutely sure?`
    )

    if (!confirmed) {
      throw new Error('Bulk delete cancelled by user')
    }
  }

  // Use soft delete
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .in('id', ids)

  if (error) throw error

  return {
    success: true,
    deletedCount: ids.length,
    restorable: true
  }
}
```

## 3. Production Database Protection

```sql
-- Add a safety table to track dangerous operations
CREATE TABLE IF NOT EXISTS public.dangerous_operations_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  affected_rows INTEGER,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reverted BOOLEAN DEFAULT FALSE,
  revert_details JSONB
);

-- Create a function to log dangerous operations
CREATE OR REPLACE FUNCTION log_dangerous_operation(
  p_operation_type TEXT,
  p_table_name TEXT,
  p_affected_rows INTEGER,
  p_user_id UUID
) RETURNS void AS $$
BEGIN
  INSERT INTO public.dangerous_operations_log (
    operation_type,
    table_name,
    affected_rows,
    performed_by
  ) VALUES (
    p_operation_type,
    p_table_name,
    p_affected_rows,
    p_user_id
  );

  -- Send alert if more than 50 rows affected
  IF p_affected_rows > 50 THEN
    RAISE WARNING 'ALERT: % operation affected % rows in table %',
      p_operation_type, p_affected_rows, p_table_name;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

## 4. Read-Only Mode Toggle

```typescript
// Add to environment variables
// .env.local
NEXT_PUBLIC_READ_ONLY_MODE=false

// lib/database-mode.ts
export function isReadOnlyMode(): boolean {
  return process.env.NEXT_PUBLIC_READ_ONLY_MODE === 'true'
}

export function assertWriteAccess() {
  if (isReadOnlyMode()) {
    throw new Error(
      'Database is in read-only mode. ' +
      'Write operations are temporarily disabled.'
    )
  }
}

// Use in all write operations
export async function safeUpdate(supabase: SupabaseClient, /* ... */) {
  assertWriteAccess()
  // ... rest of update logic
}
```

## 5. Database Change Approval Workflow

```typescript
// For critical operations, require admin approval

type PendingOperation = {
  id: string
  type: 'bulk_delete' | 'data_migration' | 'schema_change'
  details: any
  requestedBy: string
  requestedAt: Date
  approvedBy?: string
  approvedAt?: Date
  status: 'pending' | 'approved' | 'rejected'
}

// Store pending operations
const { error } = await supabase
  .from('pending_operations')
  .insert({
    type: 'bulk_delete',
    details: {
      table: 'hives',
      recordCount: 150,
      reason: 'Cleaning up test data'
    },
    requestedBy: user.id,
    status: 'pending'
  })

// Admin reviews and approves
// Only then execute the operation
```

## 6. Separate Database Environments

```typescript
// .env.development
NEXT_PUBLIC_SUPABASE_URL=https://dev-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=dev_key

// .env.production
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=prod_key

// Never run migration scripts against production without:
// 1. Testing in development first
// 2. Creating a backup
// 3. Having the SQL file reviewed
```

## 7. Rate Limiting on Deletions

```typescript
// Prevent accidental mass deletion scripts
const deletionLimiter = new Map<string, number>()

export function checkDeletionRateLimit(userId: string): void {
  const now = Date.now()
  const lastDeletion = deletionLimiter.get(userId) || 0

  // Allow max 1 bulk delete per minute
  if (now - lastDeletion < 60000) {
    throw new Error(
      'Rate limit exceeded. Please wait before performing another bulk operation.'
    )
  }

  deletionLimiter.set(userId, now)
}
```

## Implementation Priority

1. **Immediate**: Add soft deletes (prevents permanent loss)
2. **Week 1**: Set up automated daily backups
3. **Week 2**: Add bulk operation confirmations
4. **Week 3**: Implement dangerous operations logging
5. **Week 4**: Add read-only mode toggle

## Testing

Before deploying any of these:
1. Test in development environment
2. Verify backup/restore works
3. Test soft delete and restore flow
4. Ensure all existing features still work
