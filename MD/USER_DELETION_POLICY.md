# User Deletion Policy

## Current Behavior

### What Happens When You Try to Delete a User

**Short answer**: You **cannot** delete a user who has subscription history.

**Technical reason**: The `subscription_history` table has a foreign key constraint to `auth.users(id)`, but does **NOT** have `ON DELETE CASCADE`. This means:

```sql
DELETE FROM auth.users WHERE id = 'user-id';
-- ❌ ERROR: update or delete on table "users" violates foreign key constraint
-- DETAIL: Key (id) is still referenced from table "subscription_history"
```

### Data That Would Be Lost (If Deletion Were Allowed)

If we added `ON DELETE CASCADE` to allow deletion, the following data would be permanently lost:

| Table | Behavior | Impact |
|-------|----------|--------|
| **subscription_history** | CASCADE delete | ❌ All payment records lost |
| **colonies** | CASCADE delete | ❌ All colony records lost |
| **colony_movements** | CASCADE delete | ❌ Colony movement history lost |
| **tasks_events** | CASCADE delete | ❌ Calendar events lost |
| **hives** | CASCADE delete | ❌ All hive records lost |
| **inspections** | CASCADE delete | ❌ All inspection data lost |
| **apiaries** | CASCADE delete | ❌ All apiary records lost |
| **profiles** | Deleted | ❌ User profile and subscription status lost |

### Why This Is Problematic

1. **Legal/Compliance Issues**:
   - Payment records should be kept for accounting/tax purposes
   - Subscription history needed for refund disputes
   - May violate data retention policies

2. **Business Impact**:
   - Cannot track registration code usage after deletion
   - Cannot identify duplicate email signups
   - Cannot prevent subscription abuse

3. **User Experience**:
   - Users cannot recover their account if deleted by mistake
   - All beekeeping data lost forever
   - No audit trail

## Recommended Solution: Soft Delete

Instead of hard deleting users, implement a **soft delete** system that:
- ✅ Preserves all subscription and payment history
- ✅ Allows account restoration
- ✅ Maintains referential integrity
- ✅ Supports compliance requirements
- ✅ Prevents abuse (email can't be reused)

### How Soft Delete Works

1. **Mark as Deleted**:
   - Add `deleted_at` timestamp to profile
   - Set `is_active = false`
   - Ban the auth.users account
   - Optionally anonymize email

2. **Hide from Normal Queries**:
   - Use `WHERE deleted_at IS NULL` in queries
   - Create `active_profiles` view
   - Update RLS policies to exclude deleted users

3. **Allow Restoration**:
   - Admin can restore deleted accounts
   - Requires new email address
   - Preserves all historical data

## Implementation

### Install Soft Delete System

Run this migration in Supabase:

```sql
\i migrations/add_soft_delete_for_users.sql
```

This creates:
- `deleted_at` column on profiles table
- `soft_delete_user(user_id)` function
- `restore_deleted_user(user_id, new_email)` function
- `active_profiles` view
- `deleted_profiles` view (admin only)
- Updated RLS policies

### Usage Examples

#### Soft Delete a User

```sql
-- As admin
SELECT soft_delete_user('user-uuid-here');

-- Returns:
{
  "success": true,
  "message": "User soft deleted successfully",
  "deleted_at": "2025-11-09T10:30:00Z",
  "subscription_history_preserved": true,
  "payment_history_preserved": true
}
```

What happens:
- Profile marked with `deleted_at` timestamp
- Account set to `is_active = false`
- Email changed to `deleted_{uuid}@deleted.local`
- Auth account banned until 2099-12-31
- **All data preserved**: subscription history, payments, hives, etc.

#### Restore a Deleted User

```sql
-- As admin
SELECT restore_deleted_user(
  'user-uuid-here',
  'newemail@example.com'
);

-- Returns:
{
  "success": true,
  "message": "User restored successfully",
  "email": "newemail@example.com"
}
```

What happens:
- `deleted_at` set to NULL
- Account set to `is_active = true`
- Email updated to new address
- Auth account unbanned
- **All historical data intact**: subscription still active, all hives restored

#### Query Active Users Only

```sql
-- Using the view (recommended)
SELECT * FROM active_profiles WHERE email = 'user@example.com';

-- Or with WHERE clause
SELECT * FROM profiles
WHERE deleted_at IS NULL
  AND email = 'user@example.com';
```

#### Admin: View Deleted Users

```sql
SELECT
  id,
  email,
  full_name,
  deleted_at,
  subscription_expires_at,
  subscription_type
FROM deleted_profiles
ORDER BY deleted_at DESC;
```

## User Management UI Changes

### Current Settings Page

Update the "Delete Account" functionality:

**Before** (Hard Delete):
```typescript
// ❌ Don't do this
await supabase.auth.admin.deleteUser(userId)
// This will fail with foreign key error!
```

**After** (Soft Delete):
```typescript
// ✅ Use soft delete
const { data, error } = await supabase.rpc('soft_delete_user', {
  p_user_id: userId
})

if (error) {
  alert('Failed to delete account: ' + error.message)
  return
}

// Show success message
alert('Account deleted successfully. All data preserved for recovery.')

// Sign user out
await supabase.auth.signOut()
router.push('/login')
```

### Admin Panel

Add user restoration feature:

```typescript
// Admin: Restore deleted user
const restoreUser = async (userId: string, newEmail: string) => {
  const { data, error } = await supabase.rpc('restore_deleted_user', {
    p_user_id: userId,
    p_new_email: newEmail
  })

  if (!data.success) {
    alert(data.message)
    return
  }

  alert('User restored successfully!')
  // Refresh user list
  fetchUsers()
}
```

## Data Retention Policy

### Recommended Approach

1. **Immediate Soft Delete**:
   - User requests deletion
   - Account marked as deleted immediately
   - User cannot log in
   - Data preserved but hidden

2. **Grace Period** (30 days):
   - User can request restoration via support
   - Admin can restore with new email
   - All data intact

3. **Hard Delete After Grace Period** (Optional):
   - After 30-90 days, optionally hard delete
   - Keep subscription_history for accounting
   - Delete personal data (GDPR compliance)

### GDPR Compliance

For GDPR compliance, you may need to:

1. **Anonymize Personal Data**:
   - Keep subscription records
   - Remove: full_name, email (except deleted marker), phone
   - Keep: payment amounts, dates, subscription codes

2. **Right to Be Forgotten**:
   - Users can request full deletion
   - Keep minimal payment records for tax purposes
   - Delete all beekeeping data

Example anonymization:

```sql
UPDATE profiles
SET
  full_name = 'Deleted User',
  email = 'deleted_' || id || '@deleted.local',
  phone = NULL,
  deleted_at = NOW()
WHERE id = 'user-uuid';
```

## Migration Path

### Phase 1: Add Soft Delete (Immediate)

1. Run `add_soft_delete_for_users.sql` migration
2. Update Settings page to use `soft_delete_user()`
3. Test deletion and restoration

### Phase 2: Update Queries (Gradual)

1. Update all user queries to use `active_profiles` view
2. Or add `WHERE deleted_at IS NULL` to existing queries
3. Update admin panel to show deleted users separately

### Phase 3: Data Retention Policy (Later)

1. Decide on retention period (30/60/90 days)
2. Create scheduled job to hard delete old soft-deleted accounts
3. Implement anonymization for GDPR compliance

## Testing

### Test Soft Delete

1. Create test user with active subscription
2. Soft delete the user
3. Verify:
   - ✓ Cannot log in
   - ✓ Not visible in active_profiles
   - ✓ Subscription history preserved
   - ✓ Payment records intact

### Test Restoration

1. Restore the deleted user with new email
2. Verify:
   - ✓ Can log in with new email
   - ✓ Subscription still active
   - ✓ All hives and data intact
   - ✓ Subscription expires_at unchanged

## Summary

### Current State
- ❌ RLS policy allows users to delete their own profiles
- ❌ Deletion fails for users with subscription history (foreign key error)
- ❌ Hard delete would lose all payment records
- ❌ No way to restore accidentally deleted accounts

### After Implementing Soft Delete
- ✅ Can safely "delete" users anytime
- ✅ Preserves all subscription and payment history
- ✅ Allows account restoration
- ✅ Supports compliance requirements
- ✅ Better user experience
- ✅ Prevents direct deletion via RLS policy

## Action Items

### Step 1: Check Current Constraints (Immediate)

Run this to see the deletion impact:

```sql
\i sql/check_foreign_key_constraints.sql
```

This shows:
- All foreign key constraints
- ON DELETE behavior for each table
- How many records would be affected

### Step 2: Install Soft Delete System (Immediate)

```sql
-- Install soft delete functions and views
\i migrations/add_soft_delete_for_users.sql

-- Update RLS policies to prevent direct deletion
\i sql/fix_user_deletion_policy.sql
```

### Step 3: Update Settings Page (Soon)

Replace the delete account button handler with soft delete.

See "User Management UI Changes" section above for code examples.

### Step 4: Add Admin Restoration UI (Later)

Add ability for admins to restore deleted users.

### Step 5: Implement Data Retention Policy (Optional)

Set up scheduled job to permanently delete old soft-deleted accounts after grace period.
