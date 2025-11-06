# Database Migrations

This folder contains SQL migration scripts for the HiveCraic database.

## How to Run Migrations

### Using Supabase Dashboard

1. Log in to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of the migration file
5. Click **Run** to execute the migration
6. Verify the changes in the **Table Editor**

### Migration Files

#### `create_tasks_events_table.sql`
**Status**: ⏳ Pending (needs to be run)
**Created**: November 4, 2025
**Purpose**: Creates the `tasks_events` table for managing user tasks, events, and reminders

**What it creates:**
- `tasks_events` table with all columns and constraints
- Indexes for query optimization
- Row Level Security (RLS) policies
- Triggers for automatic timestamp updates
- Table and column comments

**How to verify:**
```sql
-- Check table exists
SELECT * FROM information_schema.tables
WHERE table_name = 'tasks_events';

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'tasks_events';

-- Check policies
SELECT * FROM pg_policies
WHERE tablename = 'tasks_events';

-- Test insert (should work for authenticated users)
INSERT INTO tasks_events (user_id, title, event_type, start_date)
VALUES (auth.uid(), 'Test Task', 'task', CURRENT_DATE);

-- View your tasks
SELECT * FROM tasks_events WHERE user_id = auth.uid();
```

## Migration Order

If running multiple migrations, execute them in this order:

1. `create_tasks_events_table.sql` - Tasks and events feature

## Rollback

To rollback the tasks_events migration:

```sql
-- Drop table (this will cascade delete all tasks and events!)
DROP TABLE IF EXISTS tasks_events CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS update_tasks_events_updated_at CASCADE;
```

⚠️ **Warning**: Rollback will permanently delete all tasks and events data!

## Best Practices

1. **Backup First**: Always backup your database before running migrations
2. **Test in Development**: Test migrations in a development environment first
3. **Read the SQL**: Review the migration file before running
4. **Verify Results**: Check that tables, indexes, and policies were created correctly
5. **Document Changes**: Update this README when adding new migrations

## Troubleshooting

### Error: "relation already exists"
The table may already exist. Check with:
```sql
SELECT * FROM information_schema.tables WHERE table_name = 'tasks_events';
```

### Error: "permission denied"
Ensure you're connected as a user with sufficient privileges (typically the postgres user in Supabase).

### RLS Policies Not Working
Verify RLS is enabled:
```sql
ALTER TABLE tasks_events ENABLE ROW LEVEL SECURITY;
```

Check policies exist:
```sql
SELECT * FROM pg_policies WHERE tablename = 'tasks_events';
```
