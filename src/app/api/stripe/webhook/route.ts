import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Fail-fast at module init so a missing env surfaces at deploy time, not in a
// per-request 500 with an opaque 'Webhook error' log line. The helper returns
// a non-nullable `string` so the consts can be used inside the POST closure
// without TS losing the narrowing across scopes.
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`stripe webhook: ${name} must be set.`)
  }
  return value
}
const STRIPE_SECRET_KEY = requireEnv('STRIPE_SECRET_KEY')
const STRIPE_WEBHOOK_SECRET = requireEnv('STRIPE_WEBHOOK_SECRET')
const SUPABASE_URL = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

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

    // Idempotency guard. Stripe can redeliver any event (retry on non-2xx,
    // network blip, duplicate delivery). The activation RPC is not
    // idempotent: a redelivery would create a second subscription_history
    // row and reset profiles.subscription_expires_at to NOW + 12 months.
    //
    // INSERT ... ON CONFLICT DO NOTHING. If a row already existed for this
    // event_id, the result set is empty -> we've seen this event before.
    // Return 200 immediately and skip every side effect below.
    //
    // RETURNING event_id lets us distinguish a fresh insert (data.length
    // === 1) from a duplicate (data.length === 0). A genuine DB error here
    // returns 500 so Stripe retries -- safer than racing through to the
    // RPC without an idempotency marker.
    const { data: insertedEvent, error: insertError } = await supabase
      .from('stripe_webhook_events')
      .insert({ event_id: event.id, event_type: event.type })
      .select('event_id')
    if (insertError && insertError.code !== '23505') {
      console.error(`Stripe webhook: failed to record event=${event.id}:`, insertError.message)
      return NextResponse.json(
        { error: 'Failed to record event' },
        { status: 500 }
      )
    }
    // At this point insertError is either null (fresh insert succeeded) or
    // its code is '23505' (PK conflict = replay). Anything else was already
    // returned above as a 500. Treat any remaining insertError as a replay
    // marker -- the explicit code re-check tripped TS narrowing because the
    // union collapsed after the if-block above.
    const isReplay = !!insertError || !insertedEvent || insertedEvent.length === 0
    if (isReplay) {
      console.warn(`[AUDIT] Stripe webhook replay ignored: event=${event.id} type=${event.type} timestamp=${new Date().toISOString()}`)
      return NextResponse.json({ received: true, replay: true })
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

        // Call the database function to activate subscription. The RPC
        // itself is not idempotent (it always UPDATEs profiles and INSERTs
        // into subscription_history); idempotency is enforced upstream by
        // the stripe_webhook_events guard above. If we reach this line, it
        // is the first time we have seen this event.id.
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
          // Roll back the idempotency row so Stripe's retry can re-attempt
          // the activation rather than being silently dropped as a replay.
          // Best-effort: a failure here only affects whether the retry runs.
          await supabase
            .from('stripe_webhook_events')
            .delete()
            .eq('event_id', event.id)
          return NextResponse.json(
            { error: 'Failed to activate subscription' },
            { status: 500 }
          )
        }

        // Mark the event as processed. Best-effort: a failure here does NOT
        // fail the webhook (the activation already happened, Stripe must
        // not redeliver). The row stays at processed_at = NULL, which is a
        // forensic flag for follow-up but doesn't break correctness.
        await supabase
          .from('stripe_webhook_events')
          .update({ processed_at: new Date().toISOString() })
          .eq('event_id', event.id)

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
