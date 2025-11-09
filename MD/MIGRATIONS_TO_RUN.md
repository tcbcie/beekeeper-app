# Required SQL Migrations

This document lists all SQL migrations that need to be run in Supabase for the application to work correctly.

## ⚠️ CRITICAL MIGRATIONS (Must Run)

These migrations fix blocking issues that prevent core functionality from working:

### 1. Add Hive Order Column
**File**: `add_hive_order_column.sql`
**Priority**: 🔴 CRITICAL
**Issue Fixed**: Users cannot create hives - "Could not find the hive_order column"
**What It Does**: Adds the `hive_order` column to track physical hive positions at apiaries

**Run This**:
```sql
-- Copy and paste content from: sql/add_hive_order_column.sql
```

### 2. Add Hive User ID Trigger
**File**: `add_hives_user_id_trigger.sql`
**Priority**: 🔴 CRITICAL
**Issue Fixed**: Non-admin users get 400 error when creating hives
**What It Does**: Automatically sets user_id to authenticated user when creating hives

**Run This**:
```sql
-- Copy and paste content from: sql/add_hives_user_id_trigger.sql
```

## 🟡 IMPORTANT MIGRATIONS (Recommended)

These migrations improve functionality and user experience:

### 3. Complete User Deletion Function
**File**: `create_delete_auth_user_function.sql`
**Priority**: 🟡 IMPORTANT
**Issue Fixed**: Auth accounts remain after user deletion
**What It Does**: Creates RPC function to delete users from auth.users table
**Benefits**: Complete user removal, no orphaned auth accounts

**Run This**:
```sql
-- Copy and paste content from: sql/create_delete_auth_user_function.sql
```

## 📋 How to Run Migrations

### Step 1: Access Supabase SQL Editor
1. Go to: https://supabase.com/dashboard/project/tbhofdmfzwibysnnssnx
2. Click **SQL Editor** in the left sidebar

### Step 2: Run Each Migration
For each SQL file listed above:

1. Open the SQL file in your code editor
2. Copy all the content
3. Paste into Supabase SQL Editor
4. Click **Run** (or press Ctrl/Cmd + Enter)
5. Check for success message
6. ✅ Mark as completed below

### Step 3: Verify Success
After running migrations, verify:
- No error messages in SQL Editor
- Schema cache reloaded (you should see "Success" message)
- Test the functionality (e.g., try creating a hive)

## ✅ Migration Checklist

Track which migrations you've run:

- [ ] 1. add_hive_order_column.sql
- [ ] 2. add_hives_user_id_trigger.sql
- [ ] 3. create_delete_auth_user_function.sql

## 🔍 Troubleshooting

### Migration Already Run
If you see errors like "column already exists" or "function already exists", the migration has already been run. This is safe - the migrations check for existence before adding.

### Permission Errors
If you see permission errors, ensure you're using the Service Role Key or running as a superuser in Supabase.

### Schema Cache Not Reloading
If changes don't appear immediately:
1. Wait 10-30 seconds for PostgREST to reload
2. Refresh your browser
3. Try the operation again

## 📝 Notes

- **Safe to Re-run**: All migrations include existence checks and are safe to run multiple times
- **Order Matters**: Run critical migrations first (1-2) before optional ones
- **Testing**: Test functionality after each migration
- **Backup**: Supabase automatically backs up your database

## 🎯 Expected Results After All Migrations

After running all migrations:

✅ **Hive Creation Works**: All users can create hives without errors
✅ **User Deletion Complete**: Deleting users removes auth accounts
✅ **No Schema Cache Errors**: All columns exist in schema
✅ **Proper Permissions**: Non-admin users have correct access

## 🆘 Need Help?

If you encounter issues:
1. Check the error message in SQL Editor
2. Verify you're running the correct SQL file
3. Ensure you have admin/superuser access in Supabase
4. Check Supabase logs for detailed error information

---

Last Updated: November 1, 2025
Total Migrations: 3 (2 critical, 1 recommended)
