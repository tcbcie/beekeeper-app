# Vercel Environment Variables Checklist

This document lists ALL required environment variables for your HiveCraic app to work properly in Vercel.

## Quick Checklist

Use this checklist when deploying to Vercel:

### Supabase (Required)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (Critical for webhooks and admin operations)

### Stripe (Required for Payments)
- [ ] `STRIPE_SECRET_KEY` (Test: `sk_test_...` / Live: `sk_live_...`)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Test: `pk_test_...` / Live: `pk_live_...`)
- [ ] `STRIPE_WEBHOOK_SECRET` (Test: `whsec_...` / Live: `whsec_...`)
- [ ] `STRIPE_PRICE_ID_STANDARD` (Price ID for €24 standard subscription)
- [ ] `STRIPE_PRICE_ID_ASSOCIATION` (Price ID for €12 association member subscription)

### Application Settings (Required)
- [ ] `NEXT_PUBLIC_APP_URL` (Your app URL, e.g., `https://www.hivecraic.com`)

## Detailed Information

### 1. Supabase Variables

#### `NEXT_PUBLIC_SUPABASE_URL`
- **Where to find**: Supabase Dashboard → Settings → API → Project URL
- **Example**: `https://abcdefghijklmnop.supabase.co`
- **Public**: Yes (safe for client-side)
- **Required for**: All database operations

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Where to find**: Supabase Dashboard → Settings → API → Project API keys → anon/public
- **Example**: `eyJhbGc...` (long JWT token)
- **Public**: Yes (safe for client-side, respects RLS)
- **Required for**: Client-side database queries

#### `SUPABASE_SERVICE_ROLE_KEY`
- **Where to find**: Supabase Dashboard → Settings → API → Project API keys → service_role (click "Reveal")
- **Example**: `eyJhbGc...` (long JWT token, different from anon key)
- **Public**: NO (keep secret, bypasses RLS)
- **Required for**:
  - Stripe webhook processing
  - Admin operations in API routes
  - User management functions

**CRITICAL**: Without this key, Stripe webhooks will fail with "User not found" errors!

### 2. Stripe Variables

#### `STRIPE_SECRET_KEY`
- **Where to find**: Stripe Dashboard → Developers → API keys → Secret key
- **Test mode**: `sk_test_...`
- **Live mode**: `sk_live_...`
- **Public**: NO (server-side only)
- **Required for**: Creating checkout sessions, processing payments

#### `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- **Where to find**: Stripe Dashboard → Developers → API keys → Publishable key
- **Test mode**: `pk_test_...`
- **Live mode**: `pk_live_...`
- **Public**: Yes (safe for client-side)
- **Required for**: Stripe.js on client-side

#### `STRIPE_WEBHOOK_SECRET`
- **Where to find**: Stripe Dashboard → Developers → Webhooks → [Your endpoint] → Signing secret
- **Example**: `whsec_...`
- **Public**: NO (validates webhook signatures)
- **Required for**: Verifying Stripe webhook authenticity
- **Note**: Different for test mode and live mode

#### `STRIPE_PRICE_ID_STANDARD`
- **Where to find**: Stripe Dashboard → Products → [€24 product] → Pricing → Price ID
- **Example**: `price_...`
- **Required for**: €24/year standard subscription checkout

#### `STRIPE_PRICE_ID_ASSOCIATION`
- **Where to find**: Stripe Dashboard → Products → [€12 product] → Pricing → Price ID
- **Example**: `price_...`
- **Required for**: €12/year association member subscription checkout

### 3. Application Settings

#### `NEXT_PUBLIC_APP_URL`
- **Value**: Your production domain
- **Example**: `https://www.hivecraic.com` (NO trailing slash)
- **Public**: Yes
- **Required for**:
  - Stripe success/cancel redirect URLs
  - Email links
  - OAuth callbacks (if implemented)

## How to Add Variables to Vercel

### Via Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click **Settings** → **Environment Variables**
4. For each variable:
   - Enter the **Key** (variable name)
   - Enter the **Value**
   - Select environments:
     - ✓ **Production** (required)
     - ✓ **Preview** (recommended for testing)
     - ✓ **Development** (optional, for `vercel dev`)
   - Click **Save**
5. After adding all variables, **redeploy** your app

### Via Vercel CLI

```bash
# Set a single variable
vercel env add VARIABLE_NAME

# Pull production environment variables to local
vercel env pull .env.local
```

## Common Issues

### Issue: "User not found" when creating checkout session
**Cause**: `SUPABASE_SERVICE_ROLE_KEY` not set or incorrect
**Fix**: Add the service role key and redeploy

### Issue: Checkout session creation fails with 500 error
**Causes**:
- `STRIPE_SECRET_KEY` not set
- `NEXT_PUBLIC_APP_URL` not set
- Invalid Stripe API key

**Fix**: Check Vercel function logs for specific error message

### Issue: Webhook returns 401 Unauthorized
**Cause**: `STRIPE_WEBHOOK_SECRET` not set or incorrect
**Fix**: Copy the signing secret from your webhook endpoint in Stripe Dashboard

### Issue: Wrong price showing at checkout
**Cause**: `STRIPE_PRICE_ID_STANDARD` or `STRIPE_PRICE_ID_ASSOCIATION` not set correctly
**Fix**: Verify price IDs match your Stripe products

## Verification Steps

After setting all variables:

1. **Redeploy** your Vercel app
2. **Test individual code activation** (should work without Stripe)
3. **Test credit card checkout**:
   - Click "Pay €24.00 with Card"
   - Should redirect to Stripe checkout
   - Use test card: `4242 4242 4242 4242`
   - Complete payment
   - Should redirect back with success message
4. **Check Vercel Function Logs**:
   - Deployments → [Latest] → Functions
   - Look for `/api/stripe/checkout` logs
   - Should see: `[Stripe Checkout] Session created successfully`
5. **Check Stripe Webhook Logs**:
   - Stripe Dashboard → Developers → Webhooks → [Your endpoint]
   - Check recent events
   - Should show 200 status for `checkout.session.completed`

## Environment-Specific Notes

### Development (Local)
- Use test mode Stripe keys
- Point `NEXT_PUBLIC_APP_URL` to `http://localhost:3000`
- Create `.env.local` file with all variables

### Preview (Vercel Preview Deployments)
- Use test mode Stripe keys
- Point `NEXT_PUBLIC_APP_URL` to your preview URL
- Useful for testing before production

### Production (Live)
- Use **live mode** Stripe keys
- Point `NEXT_PUBLIC_APP_URL` to your production domain
- Double-check all keys before going live

## Security Best Practices

1. **Never commit** environment variables to git
2. **Never expose** service role key or secret keys client-side
3. **Rotate keys** if accidentally exposed
4. **Use different keys** for test and production
5. **Limit access** to Vercel project settings

## Test vs Production Keys

| Variable | Test Mode | Production Mode |
|----------|-----------|-----------------|
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Test webhook `whsec_...` | Live webhook `whsec_...` |
| `STRIPE_PRICE_ID_STANDARD` | Test price `price_...` | Live price `price_...` |
| `STRIPE_PRICE_ID_ASSOCIATION` | Test price `price_...` | Live price `price_...` |

All other variables remain the same between test and production.
