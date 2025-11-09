# Stripe Test Environment Setup in Vercel

This guide walks you through setting up Stripe in test mode for your Vercel deployment to test credit card subscriptions.

## Prerequisites

- Stripe account with test mode enabled
- Vercel project deployed
- Access to Stripe Dashboard and Vercel Dashboard

## Step 1: Get Stripe Test API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Toggle to **Test Mode** (switch in top right corner - should show "Test mode")
3. Go to **Developers** → **API keys**
4. Copy your test keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`) - Click "Reveal test key"

## Step 2: Create Stripe Products in Test Mode

You need to create two products for the subscription tiers:

### Product 1: Standard Subscription (€24/year)

1. Go to **Products** → **Add product**
2. Fill in:
   - **Name**: BeeKeeper App - Standard Subscription
   - **Description**: Annual subscription for individual beekeepers
   - **Pricing**: €24.00 EUR
   - **Billing period**: Yearly
   - **Payment type**: One-time payment
3. Click **Save product**
4. Copy the **Price ID** (starts with `price_`)

### Product 2: Association Member Subscription (€12/year)

1. Go to **Products** → **Add product**
2. Fill in:
   - **Name**: BeeKeeper App - Association Member Subscription
   - **Description**: Annual subscription for association members (discounted)
   - **Pricing**: €12.00 EUR
   - **Billing period**: Yearly
   - **Payment type**: One-time payment
3. Click **Save product**
4. Copy the **Price ID** (starts with `price_`)

## Step 3: Set Up Webhook Endpoint in Stripe

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your Vercel webhook URL:
   ```
   https://your-app.vercel.app/api/stripe/webhook
   ```
   Replace `your-app.vercel.app` with your actual Vercel domain

4. Under **Select events to listen to**, add:
   - `checkout.session.completed`

5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)

## Step 4: Add Environment Variables to Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add the following variables (for **Production**, **Preview**, and **Development**):

### Required Variables

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | Your Stripe test publishable key |
| `STRIPE_SECRET_KEY` | `sk_test_...` | Your Stripe test secret key |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Your webhook signing secret |
| `STRIPE_PRICE_ID_STANDARD` | `price_...` | Price ID for €24 standard subscription |
| `STRIPE_PRICE_ID_ASSOCIATION` | `price_...` | Price ID for €12 association subscription |

### Also Verify These Exist

| Variable Name | Description |
|--------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key (for webhook) |

5. Click **Save** after adding each variable

## Step 5: Redeploy Your Vercel App

After adding environment variables, you need to redeploy:

1. Go to **Deployments** tab in Vercel
2. Click on the latest deployment
3. Click the **⋯** menu → **Redeploy**
4. Select **Use existing Build Cache**
5. Click **Redeploy**

Wait for deployment to complete.

## Step 6: Test the Payment Flow

### Test with Individual Code First

1. Log into your app at `https://your-app.vercel.app`
2. Go to **Profile** → **Renew Subscription**
3. Use the **Individual Code** tab
4. Enter a valid individual code (e.g., `HIVE2025`)
5. Verify subscription activates successfully

### Test Credit Card Payment (Standard - €24)

1. Go to **Profile** → **Renew Subscription**
2. Select **Credit Card** tab
3. Leave "I am a member of a beekeeping association" **unchecked**
4. Click **Pay €24.00 with Card**
5. Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
   - Postal code: Any (e.g., 12345)
6. Complete payment
7. Verify you're redirected back with success message
8. Check your profile - subscription should be active for 12 months

### Test Association Member Payment (€12)

1. Go to **Profile** → **Renew Subscription**
2. Select **Association Code** tab
3. Enter a valid association code (e.g., `ASHFORD2026`)
4. Check "I am a member of a beekeeping association"
5. Select association from dropdown
6. Click **Pay €12.00 with Card**
7. Use test card `4242 4242 4242 4242` again
8. Complete payment
9. Verify:
   - Subscription active for 12 months
   - Association recorded in profile
   - User Management shows "Credit Card (via Association Name)"

## Step 7: Verify Webhook is Working

### Check Stripe Dashboard

1. Go to **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. Check the **Events** tab
4. You should see `checkout.session.completed` events with status 200

### Check Supabase Database

1. Go to Supabase **SQL Editor**
2. Run this query:
   ```sql
   SELECT
     email,
     subscription_expires_at,
     subscription_type,
     subscription_price,
     is_association_member
   FROM profiles
   WHERE subscription_type = 'credit_card'
   ORDER BY created_at DESC;
   ```
3. Verify the test payment appears with correct data

### Check Subscription History

```sql
SELECT
  sh.code,
  sh.activated_at,
  sh.expires_at,
  sh.subscription_type,
  sh.price_paid,
  sh.payment_method,
  p.email
FROM subscription_history sh
JOIN profiles p ON sh.user_id = p.id
WHERE sh.payment_method = 'stripe'
ORDER BY sh.activated_at DESC;
```

## Step 8: Test Error Scenarios

### Test Invalid Code

1. Try entering invalid code like `INVALID123`
2. Should show: "Invalid subscription code. Code not found."

### Test Wrong Code Type

1. Enter association code in Individual Code tab
2. Should show: "This is an association member code. Please use the Association Code payment option..."

### Test Declined Card

1. Use test card `4000 0000 0000 0002` (card declined)
2. Should show Stripe error message
3. Subscription should NOT activate

## Troubleshooting

### Webhook Returns 500 Error

**Check**:
1. Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel
2. Check webhook logs in Stripe Dashboard for error details
3. View Vercel function logs: **Deployments** → Click deployment → **Functions** tab

### Subscription Not Activating After Payment

**Check**:
1. Verify webhook signing secret matches in Vercel env vars
2. Run migration `sql/fix_get_users_show_payment_type.sql` in Supabase
3. Check if `activate_credit_card_subscription` function exists:
   ```sql
   SELECT routine_name FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name = 'activate_credit_card_subscription';
   ```

### Wrong Price Showing at Checkout

**Check**:
1. Verify `STRIPE_PRICE_ID_STANDARD` and `STRIPE_PRICE_ID_ASSOCIATION` are set correctly
2. Make sure price IDs match the products you created in Stripe
3. Redeploy Vercel app after updating env vars

### Payment Succeeds but Shows "None" in User Management

**Run this SQL in Supabase**:
```sql
-- This should already be done, but verify:
\i sql/fix_get_users_show_payment_type.sql
```

## Moving to Production

When you're ready to go live:

1. **In Stripe**:
   - Switch to **Live Mode**
   - Create the same two products (€24 and €12)
   - Copy **live** API keys and Price IDs
   - Create new webhook endpoint with **live** signing secret

2. **In Vercel**:
   - Update all `STRIPE_*` environment variables with **live** values
   - Keep `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` with `pk_live_` key
   - Keep `STRIPE_SECRET_KEY` with `sk_live_` key
   - Update `STRIPE_WEBHOOK_SECRET` with live webhook secret
   - Update both Price IDs to live versions
   - Redeploy

3. **Test with Real Card**:
   - Use a real credit card (you can refund it)
   - Verify entire flow works in production

## Support

If you encounter issues:

1. Check Stripe webhook logs
2. Check Vercel function logs
3. Check Supabase logs
4. Review `MD/TROUBLESHOOTING_CREDIT_CARD_SUBSCRIPTIONS.md`

## Test Card Numbers

Stripe provides many test cards: [https://stripe.com/docs/testing](https://stripe.com/docs/testing)

Common ones:
- **Success**: `4242 4242 4242 4242`
- **Declined**: `4000 0000 0000 0002`
- **Insufficient funds**: `4000 0000 0000 9995`
- **3D Secure required**: `4000 0027 6000 3184`
