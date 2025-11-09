# Stripe Payment Integration Setup Guide

## Overview

This guide explains how to set up Stripe payment processing for HiveCraic subscription payments.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Access to your Supabase project
3. Admin access to your deployment platform (Vercel, etc.)

## Step 1: Get Stripe API Keys

1. Log in to your Stripe Dashboard: https://dashboard.stripe.com
2. Navigate to **Developers > API keys**
3. Copy the following keys:
   - **Publishable key** (starts with `pk_test_` for test mode or `pk_live_` for live mode)
   - **Secret key** (starts with `sk_test_` for test mode or `sk_live_` for live mode)

## Step 2: Set Up Webhook Endpoint

1. In Stripe Dashboard, go to **Developers > Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL:
   ```
   https://your-domain.com/api/stripe/webhook
   ```
4. Select events to listen to:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)

## Step 3: Configure Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret_here

# Supabase Service Role Key (for server-side operations)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# App URL (for Stripe redirect URLs)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Change to your production URL in production
```

### Where to Find Supabase Service Role Key

1. Go to your Supabase project dashboard
2. Navigate to **Settings > API**
3. Copy the **service_role** key (⚠️ Never expose this publicly!)

## Step 4: Test the Integration

### Test Mode (Recommended First)

1. Use Stripe test keys (starting with `pk_test_` and `sk_test_`)
2. Use Stripe test card numbers:
   - **Success**: `4242 4242 4242 4242`
   - **Decline**: `4000 0000 0000 0002`
   - **3D Secure**: `4000 0025 0000 3155`
   - Use any future expiry date, any 3-digit CVC, and any ZIP code

### Testing Workflow

1. Start your development server: `npm run dev`
2. Navigate to Profile page
3. Click "Renew Subscription"
4. Select "Card" payment method
5. Choose association membership status
6. Click "Pay with Card"
7. You'll be redirected to Stripe Checkout
8. Complete payment with test card
9. Verify webhook received in Stripe Dashboard > Developers > Webhooks
10. Check subscription was activated in your app

## Step 5: Production Deployment

### Environment Variables Setup

Add the same environment variables to your production environment:

**For Vercel:**
1. Go to Project Settings > Environment Variables
2. Add all the variables listed above
3. Use **production** Stripe keys (starting with `pk_live_` and `sk_live_`)
4. Update `NEXT_PUBLIC_APP_URL` to your production URL

**For other platforms:**
Follow their specific instructions for adding environment variables.

### Update Stripe Webhook URL

1. In Stripe Dashboard, update your webhook endpoint URL to production:
   ```
   https://your-production-domain.com/api/stripe/webhook
   ```
2. Update the webhook signing secret in your production environment variables

## Pricing Structure

The application supports two pricing tiers:

| Customer Type | Annual Price | Notes |
|---------------|--------------|-------|
| Association Member | €12/year | Must select their Irish beekeeping association |
| Non-Member | €24/year | Standard rate |

## How It Works

### 1. User Flow

1. User clicks "Renew Subscription" on Profile page
2. Selects "Card" payment method
3. Checks "I'm a member of an Irish Beekeeping Association" if applicable
4. Selects their association from dropdown (79 associations available)
5. Price updates automatically (€12 for members, €24 for non-members)
6. Clicks "Pay with Card"
7. Redirected to Stripe Checkout
8. Completes payment
9. Redirected back to Profile page with success message
10. Subscription automatically activated for 12 months

### 2. Technical Flow

1. **Frontend** (`src/components/RenewSubscriptionModal.tsx`):
   - Collects payment information
   - Calls `/api/stripe/checkout` endpoint

2. **Checkout API** (`src/app/api/stripe/checkout/route.ts`):
   - Validates user
   - Calculates price based on membership status
   - Creates Stripe Checkout session
   - Returns checkout URL

3. **Stripe Hosted Checkout**:
   - User completes payment securely on Stripe's servers
   - No PCI compliance requirements for you

4. **Webhook Handler** (`src/app/api/stripe/webhook/route.ts`):
   - Receives `checkout.session.completed` event
   - Verifies webhook signature
   - Calls `activate_credit_card_subscription` database function
   - Activates user's subscription for 12 months

5. **Database Function** (`sql/create_time_based_subscription_system.sql`):
   - Updates user profile with subscription details
   - Records subscription type, price, association membership
   - Logs to subscription history table
   - Sets expiration date to NOW() + 12 months

## Database Schema

The subscription system uses the following tables:

### `beekeeping_associations`
- Stores 79 Irish beekeeping associations
- Fields: `id`, `name`, `jurisdiction`, `county_area`, `affiliation`

### `profiles` (updated columns)
- `subscription_type`: 'code' | 'credit_card' | 'none'
- `subscription_price`: Amount paid
- `subscription_expires_at`: Expiration date
- `is_association_member`: Boolean flag
- `association_id`: FK to beekeeping_associations
- `stripe_customer_id`: Stripe customer reference

### `subscription_history`
- Full audit trail of all subscription activations
- Includes payment method, price, Stripe payment intent ID

## Security Considerations

1. **Never expose** the Stripe secret key or webhook secret publicly
2. **Always verify** webhook signatures to prevent fraud
3. **Use HTTPS** in production
4. **Service role key** should only be used server-side
5. **Test thoroughly** with test keys before going live

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook endpoint is publicly accessible
2. Verify webhook signing secret matches
3. Check Stripe Dashboard > Developers > Webhooks > Event logs
4. Ensure you're listening for correct events

### Payment Succeeds But Subscription Not Activated

1. Check webhook handler logs for errors
2. Verify `activate_credit_card_subscription` function exists in database
3. Check Supabase service role key is correct
4. Review subscription_history table for entries

### Association Dropdown Empty

1. Verify associations were imported: Run `import_irish_associations.sql`
2. Check RLS policies allow reading `beekeeping_associations` table
3. Verify `is_active = true` for associations

### Stripe API Errors

1. Verify API keys are correct and for the right environment (test vs. live)
2. Check Stripe API version compatibility
3. Review Stripe Dashboard > Developers > Logs

## Support

For Stripe-specific issues:
- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com

For application-specific issues:
- Check application logs
- Review Supabase logs
- Contact your development team

## Migration Checklist

Before going live with Stripe payments:

- [ ] Stripe account verified and activated
- [ ] Live API keys obtained
- [ ] Production webhook endpoint configured
- [ ] Environment variables set in production
- [ ] Tested with real card (or test mode thoroughly)
- [ ] Database migrations run (associations table + functions)
- [ ] 79 associations imported
- [ ] RLS policies configured
- [ ] Webhook signature verification working
- [ ] Success/cancel redirect URLs tested
- [ ] Email receipts configured in Stripe (optional)
- [ ] Refund policy documented
- [ ] Customer support process defined
