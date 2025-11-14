# Transaction ID and Subscription History Features

## Summary
Added transaction ID tracking and subscription history view to the admin user management interface.

## Changes Made

### 1. SQL Database Updates

#### File: `sql/add_transaction_id_to_user_management.sql`
**Purpose**: Update the `get_users_with_email` function to include the latest Stripe transaction ID

**What it does**:
- Adds `latest_transaction_id` column to the function return type
- Joins with `subscription_history` table to get the most recent credit card payment
- Only includes transactions with Stripe payment intent IDs
- Orders by `activated_at DESC` to get the latest transaction

**To apply**: Run this SQL script in your Supabase SQL Editor

#### File: `sql/fix_admin_update_user_role.sql`
**Purpose**: Fix RLS (Row Level Security) policies to allow admins to update user roles

**What it does**:
- Recreates RLS policies for the `profiles` table
- Users can update their own profile but **cannot** change their own role
- Admins can update any user's profile including roles
- Fixes the issue where role changes weren't working

**To apply**: Run this SQL script in your Supabase SQL Editor

### 2. Frontend Updates

#### File: `src/app/dashboard/settings/page.tsx`

**TypeScript Interface Updates**:
- Added `latest_transaction_id?: string | null` to `UserProfile` interface
- Created new `SubscriptionHistoryRecord` interface for history records

**State Management**:
- Added `showSubscriptionHistory` state flag
- Added `subscriptionHistory` state array
- Added `loadingHistory` state flag

**New Function: `fetchSubscriptionHistory()`**:
- Fetches all subscription history records from the database
- Joins with `profiles` table to get user emails
- Orders by activation date (most recent first)
- Formats data for display in the table

**User Management Tabs**:
- Added 4th tab: "Subscription History"
- Updated all tab logic to include the new subscription history state
- Tab shows count of subscription records

**Transaction ID Display in User Cards**:
- Shows transaction ID for users with `subscription_type === 'credit_card'`
- Displays full Stripe payment intent ID (e.g., `pi_3AbCdEfGhIjKlMnO1234567890`)
- Includes clickable link to view transaction in Stripe dashboard
- Only visible for credit card subscribers

**Subscription History View**:
- Full table view of all subscription records
- Columns:
  - User Email
  - Subscription Type (badge: credit_card or other)
  - Association Code (if used)
  - Price Paid (€ formatted)
  - Payment Method
  - Transaction ID (with Stripe dashboard link)
  - Activated Date
  - Expires Date
- Responsive table with hover effects
- Loading state with spinner
- Empty state message

## How to Use

### 1. Apply SQL Changes

Run both SQL scripts in your Supabase SQL Editor:
1. `sql/fix_admin_update_user_role.sql` - Fixes role change permissions
2. `sql/add_transaction_id_to_user_management.sql` - Adds transaction ID to user data

### 2. View Transaction IDs

1. Go to Dashboard → Settings → User Management
2. View the "Active Users" tab
3. Expand a user card (users with credit card subscriptions)
4. Look for the "Transaction ID" field
5. Click "View in Stripe →" to open the transaction in Stripe dashboard

### 3. View Subscription History

1. Go to Dashboard → Settings → User Management
2. Click the "Subscription History" tab
3. See all subscription records in a sortable table
4. Click "View in Stripe →" on any transaction to view details in Stripe

### 4. Change User Roles

1. Go to Dashboard → Settings → User Management
2. View the "Active Users" tab
3. Use the dropdown next to a user's name to change their role
4. Select: User, Power User, or Admin
5. Confirm the change

## Features

### Transaction ID Tracking
- ✅ Stores Stripe payment intent ID in `subscription_history`
- ✅ Shows latest transaction ID in user management
- ✅ Clickable link to Stripe dashboard
- ✅ Only shows for credit card payments
- ✅ Automatically updates when new payments are made

### Subscription History
- ✅ Complete audit trail of all subscriptions
- ✅ Shows user email, type, code, price, payment method
- ✅ Transaction IDs with Stripe dashboard links
- ✅ Activation and expiration dates
- ✅ Clean table interface with hover effects
- ✅ Loading and empty states

### Role Management Fix
- ✅ Admins can now change user roles
- ✅ Users cannot change their own role
- ✅ Proper RLS policies prevent unauthorized changes
- ✅ Confirmation dialog before role change

## Database Schema

### `subscription_history` table
Already exists, now properly utilized:
- `id` - UUID primary key
- `user_id` - UUID foreign key to profiles
- `code` - TEXT (association code if used)
- `code_id` - UUID (reference to registration_codes)
- `activated_at` - TIMESTAMPTZ
- `expires_at` - TIMESTAMPTZ
- `subscription_type` - TEXT (e.g., 'credit_card')
- `price_paid` - NUMERIC
- `payment_method` - TEXT (e.g., 'stripe')
- `stripe_payment_intent_id` - TEXT ⭐ **KEY FIELD**

## Stripe Integration

### Payment Intent ID Format
Stripe payment intent IDs look like: `pi_3AbCdEfGhIjKlMnO1234567890`

### Stripe Dashboard URL
Direct link format: `https://dashboard.stripe.com/payments/{payment_intent_id}`

### What You Can See in Stripe
- Payment amount and currency
- Card details (last 4 digits)
- Customer information
- Payment status and timeline
- Refund history
- Related charges and invoices

## Testing

### Test Transaction ID Display
1. Make a test credit card payment with Stripe
2. Wait for webhook to process
3. Check user management → find the user
4. Verify transaction ID appears
5. Click "View in Stripe →" and verify it opens correct payment

### Test Subscription History
1. Make several test payments (if possible)
2. Go to Subscription History tab
3. Verify all payments appear in the table
4. Check that codes, prices, and dates are correct
5. Verify Stripe links work

### Test Role Changes
1. Try to change your own role (should show alert preventing it)
2. As admin, change another user's role
3. Verify role changes immediately in the UI
4. Refresh page and verify change persisted

## Troubleshooting

### Transaction ID Not Showing
- Check that `sql/add_transaction_id_to_user_management.sql` was run
- Verify the user has a record in `subscription_history`
- Check that `stripe_payment_intent_id` is not NULL in the history record

### Subscription History Empty
- Check that `subscription_history` table has records
- Verify RLS policies allow admins to read the table
- Check browser console for errors

### Cannot Change User Role
- Run `sql/fix_admin_update_user_role.sql`
- Verify you are logged in as an Admin
- Check browser console for RLS policy errors
- Verify the user you're trying to change is not yourself

## Related Files

### Previously Created
- `sql/fix_credit_card_preserve_association_code.sql` - Preserves association codes
- `sql/diagnose_credit_card_subscription.sql` - Diagnostic tool

### New Files
- `sql/add_transaction_id_to_user_management.sql`
- `sql/fix_admin_update_user_role.sql`
- `TRANSACTION_ID_AND_HISTORY_FEATURES.md` (this file)

## Next Steps

1. Run the SQL scripts in production
2. Test transaction ID display with a real payment
3. Verify subscription history shows all records
4. Confirm role changes work for admins
5. Monitor for any errors in browser console or Supabase logs
