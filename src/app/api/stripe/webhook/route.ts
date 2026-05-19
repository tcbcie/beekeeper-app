import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Fail-fast at module init so a missing env surfaces at deploy time, not in a
// per-request 500 with an opaque 'Webhook error' log line.
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'stripe webhook: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY must be set.'
  )
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-10-29.clover'
})

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const EXPECTED_CURRENCY = 'eur'

// UUID v4-ish check -- the userId arriving in metadata should be a Supabase
// auth.users.id, which is always a UUID. Anything else is a sign of metadata
// corruption and should not be passed to the RPC.
function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    // Verify webhook signature. The Stripe SDK also enforces a 5-minute
    // timestamp tolerance on the t= field of the signature header, so this
    // call rejects replayed events older than that window.
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Extract metadata
        const userId = session.metadata?.userId
        const isAssociationMember = session.metadata?.isAssociationMember === 'true'
        const associationId = session.metadata?.associationId || null
        const associationCode = session.metadata?.associationCode || null

        // Validate userId shape before passing to the RPC. A non-UUID value
        // here would surface as a confusing Postgres error and burn a Stripe
        // retry; better to 400 it immediately.
        if (!isUuid(userId)) {
          console.error(`Stripe webhook: invalid or missing userId in metadata for event=${event.id}`)
          console.warn(`[AUDIT] Stripe subscription activation: event=${event.id} status=failed reason=invalid_user_id timestamp=${new Date().toISOString()}`)
          return NextResponse.json({ error: 'Missing or invalid userId' }, { status: 400 })
        }

        // Validate payment_intent. Stripe types it string|PaymentIntent|null;
        // for paid Checkout sessions it is always a string, but never assume.
        const paymentIntentId = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id
        if (!paymentIntentId) {
          console.error(`Stripe webhook: missing payment_intent on session=${session.id} event=${event.id}`)
          console.warn(`[AUDIT] Stripe subscription activation: event=${event.id} user=${userId} status=failed reason=missing_payment_intent timestamp=${new Date().toISOString()}`)
          return NextResponse.json({ error: 'Missing payment_intent' }, { status: 400 })
        }

        // Prefer Stripe's authoritative amount over our own metadata. Falls
        // back to metadata.priceEur for legacy sessions that pre-date this
        // change. amount_total is in the smallest currency unit (cents).
        let priceEur: number
        if (typeof session.amount_total === 'number' && Number.isFinite(session.amount_total)) {
          priceEur = session.amount_total / 100
        } else {
          const parsedFallback = parseFloat(session.metadata?.priceEur || '0')
          priceEur = Number.isNaN(parsedFallback) ? 0 : parsedFallback
        }

        // Currency assertion -- the checkout route hardcodes EUR; if a future
        // change ever creates a session in a different currency without
        // updating the column unit, refuse the activation rather than
        // silently record the wrong number.
        if (session.currency && session.currency.toLowerCase() !== EXPECTED_CURRENCY) {
          console.error(`Stripe webhook: unexpected currency=${session.currency} on event=${event.id}`)
          console.warn(`[AUDIT] Stripe subscription activation: event=${event.id} user=${userId} status=failed reason=currency_mismatch currency=${session.currency} timestamp=${new Date().toISOString()}`)
          return NextResponse.json({ error: 'Unexpected currency' }, { status: 400 })
        }

        // Call the database function to activate subscription. Note: this
        // RPC is NOT idempotent today. Stripe can redeliver this event on
        // retry, which will create duplicate subscription_history rows and
        // extend the subscription expiry. Route-level dedupe via a
        // stripe_webhook_events table is the planned follow-up.
        const { data, error } = await supabase.rpc('activate_credit_card_subscription', {
          p_user_id: userId,
          p_stripe_payment_intent_id: paymentIntentId,
          p_is_association_member: isAssociationMember,
          p_association_id: associationId,
          p_price_paid: priceEur,
          p_association_code: associationCode
        })

        if (error) {
          console.error(`Stripe webhook: activation RPC failed for event=${event.id} user=${userId}:`, error.message)
          console.warn(`[AUDIT] Stripe subscription activation: event=${event.id} user=${userId} pi=${paymentIntentId} status=failed timestamp=${new Date().toISOString()}`)
          return NextResponse.json(
            { error: 'Failed to activate subscription' },
            { status: 500 }
          )
        }

        console.warn(`[AUDIT] Stripe subscription activation: event=${event.id} user=${userId} pi=${paymentIntentId} price=${priceEur} association_member=${isAssociationMember} status=success timestamp=${new Date().toISOString()}`)

        // If an association code was used, increment its usage count.
        // A failure here does NOT fail the webhook -- the subscription is
        // already activated and Stripe must not redeliver.
        if (associationCode) {
          const { error: updateError } = await supabase.rpc('increment_code_uses', {
            p_code: associationCode
          })

          if (updateError) {
            console.error(`Stripe webhook: failed to increment code uses for event=${event.id}:`, updateError.message)
            console.warn(`[AUDIT] Association code usage increment: event=${event.id} user=${userId} status=failed timestamp=${new Date().toISOString()}`)
          } else {
            console.warn(`[AUDIT] Association code usage increment: event=${event.id} user=${userId} status=success timestamp=${new Date().toISOString()}`)
          }
        }

        // Drop result data from logs -- it may contain user/profile fields.
        void data

        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.warn(`[AUDIT] Stripe payment failed: event=${event.id} pi=${paymentIntent.id} timestamp=${new Date().toISOString()}`)
        break
      }

      default:
        console.warn(`Stripe webhook: unhandled event type=${event.type} event=${event.id}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
