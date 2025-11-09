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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, isAssociationMember, associationId, associationCode } = body

    console.log('[Stripe Checkout] Request received:', {
      userId,
      isAssociationMember,
      associationId,
      associationCode: associationCode ? '***' : null
    })

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check environment variables
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[Stripe Checkout] SUPABASE_SERVICE_ROLE_KEY not set!')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Validate user exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('[Stripe Checkout] Profile query error:', profileError)
      return NextResponse.json(
        { error: 'User not found', details: profileError.message },
        { status: 404 }
      )
    }

    if (!profile) {
      console.error('[Stripe Checkout] Profile not found for userId:', userId)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    console.log('[Stripe Checkout] Profile found:', profile.email)

    // Calculate price based on membership status
    const priceInCents = isAssociationMember ? 1200 : 2400 // €12 or €24

    // Get association name if provided
    let associationName = null
    if (isAssociationMember && associationId) {
      const { data: association } = await supabase
        .from('beekeeping_associations')
        .select('name')
        .eq('id', associationId)
        .single()

      associationName = association?.name
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'HiveCraic Annual Subscription',
              description: isAssociationMember
                ? `Irish Beekeeping Association Member Rate${associationName ? ` - ${associationName}` : ''}`
                : 'Standard Rate - 12 Months Access',
              images: [`${process.env.NEXT_PUBLIC_APP_URL}/logo.png`],
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/profile?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/profile?payment=cancelled`,
      customer_email: profile.email,
      metadata: {
        userId: userId,
        isAssociationMember: isAssociationMember.toString(),
        associationId: associationId || '',
        associationName: associationName || '',
        associationCode: associationCode || '',
        subscriptionType: 'credit_card',
        priceEur: (priceInCents / 100).toString()
      },
    })

    // Update user's Stripe customer ID if this is their first payment
    if (session.customer) {
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: session.customer as string })
        .eq('id', userId)
    }

    return NextResponse.json({
      sessionId: session.id,
      url: session.url
    })

  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
