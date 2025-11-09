# Fix: Subscription Code Display in User Management

## Issue

Users who subscribe with a credit card (not using a registration code) show "None" in the "Sub Code" column of the User Management panel.

## Root Cause

The `get_users_with_email()` function was not returning subscription information, and when it was added, it only looked at the `registration_code` column which is NULL for credit card subscriptions.

### Two Types of Subscriptions

1. **Code-based subscriptions:**
   - User enters a registration code during signup
   - `current_subscription_code_id` → points to registration_codes table
   - `registration_code` column shows the code

2. **Credit card subscriptions:**
   - User pays directly with credit card (€24 or €12)
   - `current_subscription_code_id` → NULL
   - `subscription_type` → 'monthly' or 'association_member'
   - No registration code to display

## Solution

Updated `get_users_with_email()` function to:

1. **For code-based subscriptions:**
   - Show the registration code
   - Show the code description

2. **For credit card subscriptions:**
   - Show "Credit Card: monthly" or "Credit Card: association_member"
   - Display subscription type information

3. **Added subscription_type field** to the return values

## Implementation

### Database Function Update

File: `sql/fix_get_users_include_subscription_code.sql`

```sql
CREATE OR REPLACE FUNCTION public.get_users_with_email()
RETURNS TABLE (
  -- ... other fields
  registration_code TEXT,
  code_description TEXT,
  subscription_type TEXT,  -- NEW FIELD
  subscription_expires_at TIMESTAMPTZ,
  subscription_status TEXT,
  days_remaining INTEGER
)
```

Key logic:
```sql
-- Show registration code if exists, otherwise NULL
COALESCE(
  (SELECT code FROM public.registration_codes WHERE id = p.current_subscription_code_id),
  NULL
) as registration_code,

-- Show code description OR "Credit Card: {type}"
COALESCE(
  (SELECT description FROM public.registration_codes WHERE id = p.current_subscription_code_id),
  CASE
    WHEN p.subscription_type IS NOT NULL THEN 'Credit Card: ' || p.subscription_type
    ELSE NULL
  END
) as code_description
```

### Frontend TypeScript Update

File: `src/app/dashboard/settings/page.tsx`

Added `subscription_type` to UserProfile interface:

```typescript
interface UserProfile {
  // ... other fields
  registration_code?: string
  code_description?: string
  subscription_type?: string  // NEW FIELD
  subscription_expires_at?: string | null
  subscription_status?: 'active' | 'expiring_soon' | 'expiring_very_soon' | 'expired' | 'no_subscription'
  days_remaining?: number
}
```

## How to Apply

**Run this SQL script in Supabase:**

```bash
\i sql/fix_get_users_include_subscription_code.sql
```

Then **rebuild and redeploy the frontend** (the TypeScript changes are already committed).

## Expected Result

### Before Fix

| Email | Sub Code |
|-------|----------|
| user1@example.com (code-based) | ABC123 |
| user2@example.com (credit card) | None |

### After Fix

| Email | Sub Code | Description |
|-------|----------|-------------|
| user1@example.com (code-based) | ABC123 | Annual Membership 2025 |
| user2@example.com (credit card) | - | Credit Card: monthly |

## Testing

1. **Test Code-based Subscription:**
   - User with registration code should show the code and description

2. **Test Credit Card Subscription:**
   - User with credit card subscription should show "Credit Card: monthly" or "Credit Card: association_member"

3. **Test No Subscription:**
   - User without subscription should show "None"

## Files Modified

- ✅ [sql/fix_get_users_include_subscription_code.sql](../sql/fix_get_users_include_subscription_code.sql) - Updated function
- ✅ [src/app/dashboard/settings/page.tsx](../src/app/dashboard/settings/page.tsx) - Added subscription_type field
- ✅ [MD/FIX_SUBSCRIPTION_CODE_DISPLAY.md](FIX_SUBSCRIPTION_CODE_DISPLAY.md) - This documentation

## Summary

✅ Identified issue: Credit card subscriptions not displayed
✅ Root cause: Function only checked registration_code column
✅ Solution: Show subscription_type for credit card purchases
✅ Frontend: Updated TypeScript interface
✅ Ready to deploy
