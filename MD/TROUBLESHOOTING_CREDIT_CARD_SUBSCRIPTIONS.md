# Troubleshooting Credit Card Subscriptions

## Issue: Payment Successful But Subscription Not Updated

If a user completes a Stripe payment successfully but their subscription details aren't updated, follow these steps:

---

## Step 1: Check if Database Function Exists

Run the diagnostic script in Supabase SQL Editor:

```bash
psql $DATABASE_URL -f sql/test_credit_card_subscription.sql
```

Or in Supabase Dashboard:
1. Go to SQL Editor
2. Run `sql/test_credit_card_subscription.sql`

**Expected Results:**
- Function `activate_credit_card_subscription` should exist
- All required columns should exist in `profiles` and `subscription_history` tables

**If function doesn't exist:**
```bash
# Run the migration
psql $DATABASE_URL -f sql/create_time_based_subscription_system.sql
```

---

## Step 2: Check Stripe Webhook Logs

1. Go to Stripe Dashboard: https://dashboard.stripe.com
2. Navigate to **Developers > Webhooks**
3. Click on your webhook endpoint
4. Check **Recent deliveries**

**What to look for:**
- ✅ **Success (200)**: Webhook was called and returned successfully
- ❌ **Failed (4xx/5xx)**: Webhook has an error
- ⚠️ **Not called**: Webhook endpoint not configured or incorrect URL

**If webhook shows errors:**
- Check the error message in Stripe dashboard
- Look for console logs in your deployment platform (Vercel, etc.)

**If webhook wasn't called:**
- Verify webhook URL is correct: `https://your-domain.com/api/stripe/webhook`
- Ensure you're listening for `checkout.session.completed` event
- Check webhook signing secret matches your `.env.local`

---

## Step 3: Test Manual Activation (Debugging)

Use the test endpoint to manually activate a subscription:

```bash
# Using curl
curl -X POST http://localhost:3000/api/stripe/test-activation \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_HERE",
    "isAssociationMember": true,
    "associationId": "ASSOCIATION_ID_HERE",
    "priceEur": 12.00
  }'
```

Or use a tool like Postman/Insomnia:
- **URL**: `http://localhost:3000/api/stripe/test-activation`
- **Method**: POST
- **Body** (JSON):
```json
{
  "userId": "paste-user-id-here",
  "isAssociationMember": true,
  "associationId": null,
  "priceEur": 24.00
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Subscription activated successfully",
  "functionResult": { ... },
  "updatedProfile": {
    "subscription_type": "credit_card",
    "subscription_price": 24.00,
    "subscription_expires_at": "2026-11-08T...",
    "is_association_member": false
  }
}
```

**If this works:** Webhook isn't being called properly (see Step 2)

**If this fails:** Database function has an error (see Step 4)

---

## Step 4: Check Function Permissions

The database function needs proper permissions:

```sql
-- Check current permissions
SELECT
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'activate_credit_card_subscription';

-- Grant execute permission if missing
GRANT EXECUTE ON FUNCTION public.activate_credit_card_subscription(UUID, TEXT, BOOLEAN, UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_credit_card_subscription(UUID, TEXT, BOOLEAN, UUID, NUMERIC) TO service_role;
```

---

## Step 5: Check RLS Policies

Row Level Security policies might be blocking updates:

```sql
-- Check if RLS is enabled on profiles
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'profiles';

-- List RLS policies on profiles
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles';
```

**Solution:** Functions with `SECURITY DEFINER` should bypass RLS, but verify the function is created correctly.

---

## Step 6: Manual Database Update (Emergency Fix)

If you need to manually fix a user's subscription while troubleshooting:

```sql
-- Find the user
SELECT id, email, subscription_expires_at, subscription_type
FROM public.profiles
WHERE email = 'user@example.com';

-- Manually update their subscription
UPDATE public.profiles
SET
  subscription_expires_at = NOW() + INTERVAL '12 months',
  subscription_type = 'credit_card',
  subscription_price = 24.00,  -- or 12.00 for members
  is_association_member = false,  -- or true
  association_id = NULL,  -- or association UUID
  updated_at = NOW()
WHERE email = 'user@example.com';

-- Add to subscription history
INSERT INTO public.subscription_history (
  user_id,
  activated_at,
  expires_at,
  duration_days,
  subscription_type,
  price_paid,
  payment_method,
  stripe_payment_intent_id
) VALUES (
  (SELECT id FROM public.profiles WHERE email = 'user@example.com'),
  NOW(),
  NOW() + INTERVAL '12 months',
  365,
  'credit_card',
  24.00,
  'stripe',
  'manual_fix_' || NOW()::text
);
```

---

## Step 7: Check Console Logs

### In Development (localhost):
Check your terminal where `npm run dev` is running for webhook logs:
- 🔔 "Webhook received: checkout.session.completed"
- 📞 "Calling activate_credit_card_subscription..."
- ✅ "Subscription activated successfully"

### In Production (Vercel):
1. Go to Vercel Dashboard
2. Select your project
3. Go to **Functions** tab
4. Find `/api/stripe/webhook`
5. Click to view logs

**Look for:**
- Webhook calls
- Error messages
- Function execution results

---

## Common Issues & Solutions

### Issue: "Function does not exist"
**Solution:** Run the migration script:
```bash
psql $DATABASE_URL -f sql/create_time_based_subscription_system.sql
```

### Issue: "Permission denied for function"
**Solution:** Grant permissions:
```sql
GRANT EXECUTE ON FUNCTION public.activate_credit_card_subscription(UUID, TEXT, BOOLEAN, UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_credit_card_subscription(UUID, TEXT, BOOLEAN, UUID, NUMERIC) TO service_role;
```

### Issue: "Invalid UUID"
**Solution:** Check that userId is being passed correctly in webhook metadata

### Issue: Webhook signature verification fails
**Solution:**
- Verify `STRIPE_WEBHOOK_SECRET` in `.env.local` matches Stripe dashboard
- Use the signing secret from the webhook endpoint in Stripe dashboard

### Issue: "Column does not exist"
**Solution:** Run the migration to add missing columns:
```bash
psql $DATABASE_URL -f sql/create_time_based_subscription_system.sql
```

---

## Debugging Checklist

- [ ] Database migration ran successfully
- [ ] Function `activate_credit_card_subscription` exists
- [ ] All required columns exist in `profiles` table
- [ ] All required columns exist in `subscription_history` table
- [ ] Webhook endpoint configured in Stripe dashboard
- [ ] Webhook URL is publicly accessible
- [ ] Webhook signing secret matches environment variable
- [ ] Webhook is listening for `checkout.session.completed` event
- [ ] Service role key is correct in `.env.local`
- [ ] Function has execute permissions
- [ ] Test endpoint successfully activates subscription
- [ ] Webhook logs show successful calls in Stripe dashboard
- [ ] Console logs show webhook execution
- [ ] No RLS policies blocking updates

---

## Still Not Working?

1. **Check Stripe webhook event details** in dashboard - look at the metadata
2. **Run test endpoint** with the actual user ID to isolate webhook vs function issue
3. **Check server logs** for any error messages
4. **Verify environment variables** are set correctly in production
5. **Test in development** with Stripe test mode and ngrok/local webhook

---

## Test Workflow

**Complete test of payment flow:**

1. **Setup test mode** (in `.env.local`):
   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Test payment**:
   - Go to Profile page
   - Click "Renew Subscription"
   - Select "Card"
   - Use test card: `4242 4242 4242 4242`
   - Complete checkout

4. **Verify**:
   - Check Stripe dashboard > Webhooks > Recent deliveries
   - Check terminal/console logs
   - Check user profile in database
   - Check subscription_history table

**Expected result:** Subscription expires_at should be 12 months from now.

---

## Contact Support

If issue persists after all troubleshooting:
1. Export webhook event details from Stripe
2. Export function definition from Supabase
3. Capture console logs
4. Note exact error messages
