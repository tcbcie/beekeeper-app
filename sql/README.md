# Database Setup Scripts

This directory contains SQL scripts for setting up and managing the beekeeper application database.

## Files

### 1. `create_varroa_tables.sql`
Creates the varroa_treatments and varroa_checks tables with basic structure.
- **When to use**: First time setup when creating the varroa tracking tables
- **RLS Status**: RLS policies are commented out by default
- **Safe to run**: Yes, uses `IF NOT EXISTS` clauses

### 2. `enable_rls_for_varroa.sql`
Enables Row Level Security (RLS) for varroa tables and sets up security policies.
- **When to use**: After creating tables, when you want to enable user-based security
- **Prerequisites**:
  - varroa tables must exist
  - Supabase authentication must be configured
- **What it does**:
  - Adds `user_id` column to `hives` table (if not exists)
  - Enables RLS on varroa_treatments and varroa_checks
  - Creates policies so users can only see their own data
- **Safe to run**: Yes, checks for existing columns and drops old policies first

### 3. `assign_hives_to_user.sql`
Helper script to assign existing hives to the current authenticated user.
- **When to use**: After enabling RLS, if you have existing hives without user_id
- **Prerequisites**:
  - Must be logged in as the user who should own the hives
  - `user_id` column must exist in hives table
- **Important**: Review the COUNT before uncommenting the UPDATE statement
- **Safe to run**: Yes, but UPDATE is commented out by default

## Recommended Setup Order

### For New Databases:
1. Create your base tables (hives, apiaries, queens, inspections, etc.)
2. Run `create_varroa_tables.sql`
3. Run `enable_rls_for_varroa.sql`
4. If you want to secure hives table too, uncomment Step 7 in `enable_rls_for_varroa.sql`

### For Existing Databases (Adding Varroa Tracking):
1. Run `create_varroa_tables.sql` to create the new tables
2. **Test without RLS first** - ensure your app works
3. When ready for security:
   - Log in to your app as the user who should own the data
   - Run `enable_rls_for_varroa.sql` in Supabase SQL Editor
   - Run `assign_hives_to_user.sql` to assign existing hives to your user
   - Uncomment and execute the UPDATE in `assign_hives_to_user.sql`

## Understanding RLS Policies

The RLS policies created ensure that:
- Users can only view/edit varroa data for hives they own
- The relationship is: User → Hives → Varroa Records
- Even if someone knows a record ID, they can't access it unless they own the associated hive

## Troubleshooting

### "Column user_id does not exist"
- Run `enable_rls_for_varroa.sql` which will add the column

### "No data showing after enabling RLS"
- Your hives don't have user_id set
- Run `assign_hives_to_user.sql` while logged in

### "Permission denied for table"
- RLS is enabled but no policies exist
- Re-run `enable_rls_for_varroa.sql`

### "Want to disable RLS temporarily"
```sql
ALTER TABLE varroa_treatments DISABLE ROW LEVEL SECURITY;
ALTER TABLE varroa_checks DISABLE ROW LEVEL SECURITY;
```

## Supabase Dashboard

To run these scripts:
1. Go to your Supabase project
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the script
5. Click "Run" or press Ctrl+Enter

## Security Best Practices

✅ **DO**:
- Enable RLS on all tables with user data
- Test policies thoroughly with multiple test users
- Use `auth.uid()` for user identification
- Review policies before deploying to production

❌ **DON'T**:
- Disable RLS in production without good reason
- Use client-side filtering as your only security
- Share database credentials
- Skip testing policies with different users

## Need Help?

If you encounter issues:
1. Check the Supabase logs (Project Settings → Logs)
2. Verify your authentication is working
3. Test queries in the SQL Editor
4. Check the Supabase documentation on RLS
