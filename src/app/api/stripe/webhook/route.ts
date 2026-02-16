import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover'
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

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

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
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

        console.log('🔔 Webhook received: checkout.session.completed')
        console.log('Session ID:', session.id)
        console.log('Payment Intent:', session.payment_intent)
        console.log('Metadata:', session.metadata)

        // Extract metadata
        const userId = session.metadata?.userId
        const isAssociationMember = session.metadata?.isAssociationMember === 'true'
        const associationId = session.metadata?.associationId || null
        const associationCode = session.metadata?.associationCode || null
        const parsedPrice = parseFloat(session.metadata?.priceEur || '0')
        const priceEur = Number.isNaN(parsedPrice) ? 0 : parsedPrice

        console.log('Extracted data:', {
          userId,
          isAssociationMember,
          associationId,
          associationCode,
          priceEur
        })

        if (!userId) {
          console.error('❌ No userId in session metadata')
          return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
        }

        // Call the database function to activate subscription
        console.log('📞 Calling activate_credit_card_subscription...')
        const { data, error } = await supabase.rpc('activate_credit_card_subscription', {
          p_user_id: userId,
          p_stripe_payment_intent_id: session.payment_intent as string,
          p_is_association_member: isAssociationMember,
          p_association_id: associationId,
          p_price_paid: priceEur,
          p_association_code: associationCode
        })

        if (error) {
          console.error('❌ Error activating subscription:', error)
          console.error('Error details:', JSON.stringify(error, null, 2))
          return NextResponse.json(
            { error: 'Failed to activate subscription', details: error.message },
            { status: 500 }
          )
        }

        console.log('✅ Subscription activated successfully:', data)

        // If an association code was used, increment its usage count
        if (associationCode) {
          console.log('📊 Incrementing usage count for association code:', associationCode)
          const { error: updateError } = await supabase.rpc('increment_code_uses', {
            p_code: associationCode
          })

          if (updateError) {
            console.error('⚠️ Warning: Failed to increment code usage:', updateError)
            // Don't fail the webhook - subscription is already activated
          } else {
            console.log('✅ Code usage count incremented')
          }
        }

        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.error('Payment failed:', paymentIntent.id)
        // Could send an email notification here
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
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
