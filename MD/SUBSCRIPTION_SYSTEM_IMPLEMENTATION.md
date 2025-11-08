# Subscription System Implementation Plan

## Overview
Transform the registration code system into a full subscription management system with expiration tracking, renewal capabilities, and email notifications.

## Phase 1: Database Setup ✅

### Files Created:
- `sql/create_subscription_system.sql` - Complete database schema

### Database Changes:

#### Profiles Table (New Columns):
- `subscription_expires_at` - Date when subscription expires
- `current_subscription_code_id` - Current active subscription code
- `last_subscription_reminder_sent` - Last reminder email timestamp

#### Registration Codes Table (New Column):
- `subscription_duration_days` - How many days code extends subscription (default 365)

#### New Table: subscription_history
Tracks all subscription activations and renewals:
```sql
- id (UUID)
- user_id (UUID) → references auth.users
- code_id (UUID) → references registration_codes
- code (VARCHAR) - copy of code for history
- activated_at (TIMESTAMPTZ) - when code was used
- expires_at (TIMESTAMPTZ) - subscription expiry after this activation
- duration_days (INTEGER) - how many days added
```

### New Functions:

#### 1. `activate_subscription(code TEXT)`
**Purpose:** Activate or renew subscription with a code

**Logic:**
- Validates code (active, not expired, not max uses)
- If current subscription active: extends from expiry date
- If expired/null: starts from today
- Records in subscription_history
- Increments code usage counter

**Returns:**
```json
{
  "success": true/false,
  "message": "...",
  "expires_at": "2026-01-07T...",
  "duration_days": 365
}
```

#### 2. `get_subscription_status()`
**Purpose:** Get current user's subscription status

**Returns:**
```json
{
  "is_active": true/false,
  "status": "active|expiring_soon|expiring_very_soon|expired|no_subscription",
  "expires_at": "2026-01-07T...",
  "days_remaining": 335,
  "current_code": "ANNUAL2025",
  "code_description": "Annual subscription for 2025"
}
```

**Status Levels:**
- `active` - More than 30 days remaining
- `expiring_soon` - 8-30 days remaining
- `expiring_very_soon` - 1-7 days remaining
- `expired` - Past expiration date
- `no_subscription` - Never had subscription

#### 3. `get_subscription_history()`
**Purpose:** Get user's subscription history

**Returns:** Table with all past activations, sorted by date

#### 4. `mark_subscription_reminder_sent(user_id UUID)`
**Purpose:** Mark that reminder email was sent to user

### New View: users_needing_subscription_reminder
Shows users who need reminder emails:
- 30-day reminder (if not sent in last 7 days)
- 7-day reminder (if not sent in last 7 days)

## Phase 2: Frontend Implementation

### 2.1 Profile Page Enhancement

**File:** `src/app/dashboard/profile/page.tsx`

#### Add Subscription Status Section:
```tsx
<SubscriptionStatus />
```

**Components to Create:**

1. **SubscriptionStatusCard**
   - Shows current status with color coding
   - Expiration date with countdown
   - Progress bar showing time remaining
   - Warning badges for expiring soon

2. **RenewSubscriptionModal**
   - Input for new subscription code
   - Validation and feedback
   - Success message showing new expiry

3. **SubscriptionHistoryTable**
   - List of all past subscriptions
   - Activation dates and expiry dates
   - Duration and code used
   - Current vs historical badges

#### Status Display Colors:
- **Active** (>30 days): Green
- **Expiring Soon** (8-30 days): Yellow/Amber
- **Expiring Very Soon** (1-7 days): Orange
- **Expired**: Red
- **No Subscription**: Gray

### 2.2 Dashboard Access Control

**File:** `src/app/dashboard/layout.tsx`

Add subscription check after auth check:

```typescript
const { data: subStatus } = await supabase.rpc('get_subscription_status')

if (!subStatus.is_active) {
  // Redirect to subscription expired page or show warning
  if (subStatus.status === 'expired') {
    router.push('/subscription-expired')
  }
}
```

**Options for Expired Subscriptions:**
1. **Full Lockout** - Redirect to renewal page, no access
2. **Read-Only Mode** - Can view data but not modify
3. **Grace Period** - X days after expiry before lockout

### 2.3 Settings Page Enhancement

**File:** `src/app/dashboard/settings/page.tsx`

Add subscription columns to Users table:
- Subscription Expiry Date
- Subscription Status (badge with color)
- Days Remaining

Update `UserProfile` interface:
```typescript
interface UserProfile {
  // ... existing fields
  subscription_expires_at?: string
  subscription_status?: string
}
```

### 2.4 Create Subscription Expired Page

**File:** `src/app/subscription-expired/page.tsx`

Features:
- Clear message about expiration
- Renew subscription form
- Contact admin option
- Read-only access to view data (optional)

## Phase 3: Email Notification System

### 3.1 Email Templates

Create email templates for:

#### 30-Day Warning Email
```
Subject: Your HiveCraic Subscription Expires in 30 Days

Hi [Name],

Your HiveCraic subscription will expire on [Date].

To continue accessing your beekeeping data:
1. Contact your admin for a renewal code
2. Go to Profile → Subscription
3. Enter your renewal code

Thank you for being part of our community!
```

#### 7-Day Warning Email
```
Subject: Urgent: Your HiveCraic Subscription Expires in 7 Days

Hi [Name],

⚠️ Your subscription expires soon: [Date]

Don't lose access to your valuable beekeeping records!

Renew now: [Link]
```

#### Expiration Notice
```
Subject: Your HiveCraic Subscription Has Expired

Hi [Name],

Your subscription expired on [Date].

Your data is safe, but you currently have read-only access.

Renew to regain full access: [Link]
```

### 3.2 Email Sending Options

**Option A: Supabase Edge Functions**
```typescript
// supabase/functions/send-subscription-reminders/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  // Query users_needing_subscription_reminder
  // Send emails via Resend/SendGrid/SES
  // Mark reminders as sent
})
```

**Option B: External Cron Job**
- GitHub Actions scheduled workflow
- Vercel Cron Jobs
- Separate Node.js script

**Option C: Supabase Database Webhooks**
- Trigger on subscription_expires_at approaching
- Call external webhook service

### 3.3 Email Service Integration

**Recommended: Resend**
```bash
npm install resend
```

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: 'HiveCraic <noreply@hivecraic.com>',
  to: user.email,
  subject: 'Your Subscription Expires Soon',
  html: emailTemplate
})
```

## Phase 4: Admin Features

### 4.1 Subscription Management in Settings

Add new tab: "Subscriptions"

Features:
- View all users' subscription status
- Filter by: Active, Expiring Soon, Expired
- Manually extend subscription (admin override)
- View subscription history per user
- Subscription analytics dashboard

### 4.2 Subscription Analytics

Metrics to track:
- Total active subscriptions
- Expiring in next 30 days
- Expired subscriptions
- Average subscription duration
- Renewal rate
- Revenue projection (when payment integrated)

### 4.3 Code Management Enhancement

Update registration codes UI:
- Show subscription_duration_days
- Edit duration when creating codes
- Preset durations: 30, 90, 180, 365 days
- "Subscription Codes" vs "Registration Codes" distinction

## Phase 5: Payment Integration (Future)

### 5.1 Payment Provider Options

**Option A: Stripe**
- Recurring subscriptions
- One-time payments
- Customer portal

**Option B: Paddle**
- Handles VAT/tax
- Global payments
- Subscription management

### 5.2 Integration Flow

1. User clicks "Subscribe" or "Renew"
2. Redirect to payment page (Stripe Checkout)
3. On success: Auto-generate and apply subscription code
4. Send confirmation email
5. Update subscription_expires_at

### 5.3 Database Changes for Payments

New table: `payment_transactions`
```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  amount DECIMAL(10,2),
  currency VARCHAR(3),
  payment_provider VARCHAR(50), -- stripe, paddle
  provider_transaction_id VARCHAR(255),
  status VARCHAR(50), -- pending, completed, failed
  subscription_code_id UUID,
  created_at TIMESTAMPTZ
)
```

## Implementation Timeline

### Week 1: Database & Core Functions
- ✅ Create SQL schema
- Run migration in Supabase
- Test all functions
- Initialize existing users

### Week 2: Frontend - Profile Page
- Create SubscriptionStatusCard component
- Create RenewSubscriptionModal component
- Create SubscriptionHistoryTable component
- Add to profile page
- Test renewal flow

### Week 3: Frontend - Access Control
- Add subscription checks to dashboard layout
- Create subscription-expired page
- Implement grace period logic
- Update settings page

### Week 4: Email System
- Choose email provider (Resend recommended)
- Create email templates
- Implement Edge Function or cron job
- Test notification flow
- Deploy reminder system

### Week 5: Admin Features
- Add Subscriptions tab to Settings
- Implement subscription analytics
- Add manual extension feature
- Enhanced code management

### Week 6: Testing & Polish
- End-to-end testing
- User acceptance testing
- Documentation
- Training materials

## Database Migration Steps

### Step 1: Backup
```sql
-- Create backup of profiles table
CREATE TABLE profiles_backup AS SELECT * FROM profiles;
```

### Step 2: Run Migration
Execute `sql/create_subscription_system.sql` in Supabase SQL Editor

### Step 3: Verify
```sql
-- Check new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('subscription_expires_at', 'current_subscription_code_id', 'last_subscription_reminder_sent');

-- Check existing users have expiry dates
SELECT COUNT(*) as users_with_subscription
FROM profiles
WHERE subscription_expires_at IS NOT NULL;

-- Test functions
SELECT * FROM get_subscription_status();
```

### Step 4: Test Renewal
```sql
-- Test activating a subscription
SELECT activate_subscription('BEEKEEPER2025');

-- Check subscription history
SELECT * FROM get_subscription_history();
```

## Configuration

### Environment Variables Needed

```env
# Email Service (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Email Settings
SUBSCRIPTION_REMINDER_FROM=noreply@hivecraic.com
SUBSCRIPTION_REMINDER_REPLY_TO=support@hivecraic.com

# Subscription Settings
SUBSCRIPTION_GRACE_PERIOD_DAYS=7
SUBSCRIPTION_DEFAULT_DURATION_DAYS=365
```

### Supabase Settings

Add to Supabase project settings:
- Edge Function URL (for cron trigger)
- Database webhooks (optional)
- Secrets for API keys

## Security Considerations

1. **Function Security:**
   - All functions use `SECURITY DEFINER`
   - Only authenticated users can call functions
   - Users can only access their own subscription data

2. **Admin Functions:**
   - Manual extension requires admin role check
   - Audit log for admin actions

3. **Code Reuse Prevention:**
   - Track which user used which code
   - Prevent same user from using same code multiple times

4. **Rate Limiting:**
   - Limit renewal attempts to prevent abuse
   - Implement cooldown period between renewals

## Testing Checklist

### Database Tests
- [ ] Functions execute without errors
- [ ] Subscription extends from current expiry if active
- [ ] Subscription starts from today if expired
- [ ] History records correctly
- [ ] Status calculation correct
- [ ] Reminder view shows correct users

### Frontend Tests
- [ ] Subscription status displays correctly
- [ ] Renewal modal works
- [ ] History table shows data
- [ ] Expired users redirected
- [ ] Grace period works
- [ ] Admin can view all subscriptions

### Email Tests
- [ ] 30-day reminder sends
- [ ] 7-day reminder sends
- [ ] Expiration notice sends
- [ ] Emails formatted correctly
- [ ] Links work
- [ ] Unsubscribe works

### Integration Tests
- [ ] New user registration sets expiry
- [ ] Renewal extends subscription
- [ ] Multiple renewals stack correctly
- [ ] Expired users lose access
- [ ] Reactivation restores access

## Support Documentation

### User Guide: How to Renew Your Subscription

1. Navigate to Profile page
2. Look for "Subscription Status" section
3. Click "Renew Subscription" button
4. Enter your renewal code (obtain from admin)
5. Click "Activate"
6. Your expiration date will update

### Admin Guide: Managing Subscriptions

1. Go to Settings → Subscriptions tab
2. View all users and their status
3. Use filters to find expiring subscriptions
4. To manually extend: Click user → "Extend Subscription"
5. To create renewal codes: Registration Codes → Create with duration

## Future Enhancements

1. **Self-Service Subscription:**
   - Stripe integration for payments
   - Auto-renewal option
   - Multiple tier pricing

2. **Advanced Features:**
   - Team/organization subscriptions
   - Bulk renewals
   - Promotional codes with discounts
   - Subscription pause/resume

3. **Analytics:**
   - Revenue dashboard
   - Churn analysis
   - Lifetime value tracking
   - Renewal predictions

4. **Communication:**
   - In-app notifications
   - SMS reminders (optional)
   - Renewal success emails
   - Failed payment recovery

## Success Criteria

### Must Have:
- ✅ Database schema supports subscriptions
- ✅ Users can renew subscriptions with codes
- ✅ Expired users lose access
- ✅ Email reminders send automatically
- ✅ Admins can view all subscription status

### Should Have:
- Subscription history visible to users
- Grace period for expired subscriptions
- Analytics dashboard for admins
- Manual subscription extension

### Nice to Have:
- Payment integration
- Auto-renewal
- Multiple subscription tiers
- SMS notifications

## Questions to Answer

1. **Grace Period:** How many days after expiration before full lockout?
   - Recommendation: 7 days read-only, then full lockout

2. **Read-Only vs Lockout:** What happens when expired?
   - Option A: Full lockout, redirect to renewal page
   - Option B: Read-only mode, can view but not edit
   - Recommendation: Read-only with persistent banner

3. **Default Duration:** What's the standard subscription length?
   - Current: 365 days (1 year)
   - Consider: 30, 90, 180, 365 day options

4. **Email Frequency:** How often to send reminders?
   - Recommendation: 30 days, 7 days, then on expiration

5. **Admin Override:** Can admins extend without code?
   - Recommendation: Yes, with audit trail

## Next Steps

1. Review and approve this implementation plan
2. Run database migration in staging environment
3. Test all database functions
4. Begin frontend implementation
5. Set up email service account
6. Implement phase by phase

Would you like me to proceed with any specific phase?
