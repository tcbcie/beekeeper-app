import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Fail-fast at module init so a missing env surfaces at deploy time.
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const APP_URL = process.env.NEXT_PUBLIC_APP_URL
if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !APP_URL) {
  throw new Error(
    'stripe checkout: STRIPE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and NEXT_PUBLIC_APP_URL must be set.'
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

// Pricing is the source of truth. The webhook prefers Stripe's authoritative
// session.amount_total, but the metadata.priceEur fallback path still reads
// these via the session metadata so they must stay in sync as one constant.
const STANDARD_PRICE_CENTS = 2400
const ASSOCIATION_PRICE_CENTS = 1200
const ASSOCIATION_CODE_TYPE = 'association'

export async function POST(request: NextRequest) {
  try {
    // Auth: this endpoint creates a payment session against the calling
    // user's profile. Previously it trusted body.userId, which let any
    // client create a checkout against any user's email -- both a griefing
    // vector and the entry point for the pricing trust gap (C2 / C3 below).
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    // Parse body in an inner try/catch so a malformed payload returns 400.
    let parsed: unknown
    try {
      parsed = await request.json()
    } catch (err) {
      console.error('Stripe checkout: malformed JSON body:', err)
      return NextResponse.json({ error: 'Malformed request body' }, { status: 400 })
    }
    const body = (parsed && typeof parsed === 'object') ? (parsed as Record<string, unknown>) : {}
    const bodyUserId = typeof body.userId === 'string' ? body.userId : null
    const associationCode = typeof body.associationCode === 'string'
      ? body.associationCode.trim().toUpperCase()
      : null

    // If the client sent a userId, it must match the authenticated user.
    // Defence against a client coordinating a session for someone else;
    // also catches stale client state after account switch.
    if (bodyUserId && bodyUserId !== user.id) {
      console.warn(`[AUDIT] Stripe checkout: admin=${user.id} body_user=${bodyUserId} status=forbidden reason=user_id_mismatch timestamp=${new Date().toISOString()}`)
      return NextResponse.json({ error: 'User ID mismatch' }, { status: 403 })
    }

    // Profile lookup. We deliberately ignore any body.isAssociationMember /
    // body.associationId -- pricing is derived from the validated association
    // code below (if any), never from the client's say-so.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, is_active')
      .eq('id', user.id)
      .single()
    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (profile.is_active === false) {
      return NextResponse.json({ error: 'Account is not active' }, { status: 403 })
    }
    if (!profile.email) {
      return NextResponse.json({ error: 'Profile missing email' }, { status: 400 })
    }

    // Server-side validation of the association code. The client also runs
    // these checks for UX (see RenewSubscriptionModal.tsx), but that path
    // is bypassable by calling this endpoint directly. The discounted price
    // depends on a *server-validated* code, full stop.
    let validatedAssociationId: string | null = null
    let validatedAssociationName: string | null = null
    let isAssociationMember = false

    if (associationCode) {
      const { data: codeRow, error: codeError } = await supabase
        .from('registration_codes')
        .select('id, code, code_type, association_id, is_active, max_uses, current_uses, subscription_expires_at')
        .eq('code', associationCode)
        .maybeSingle()

      if (codeError) {
        console.error('Stripe checkout: code lookup error:', codeError.message)
        return NextResponse.json({ error: 'Failed to validate code' }, { status: 500 })
      }
      if (!codeRow) {
        return NextResponse.json({ error: 'Invalid association code' }, { status: 400 })
      }
      if (codeRow.code_type !== ASSOCIATION_CODE_TYPE) {
        return NextResponse.json({ error: 'This is not an association code' }, { status: 400 })
      }
      if (!codeRow.association_id) {
        return NextResponse.json({ error: 'This association code is not linked to an association' }, { status: 400 })
      }
      if (codeRow.is_active === false) {
        return NextResponse.json({ error: 'This association code has been disabled' }, { status: 400 })
      }
      if (codeRow.max_uses != null && (codeRow.current_uses ?? 0) >= codeRow.max_uses) {
        return NextResponse.json({ error: 'This code has reached its maximum number of uses' }, { status: 400 })
      }
      if (codeRow.subscription_expires_at && new Date(codeRow.subscription_expires_at) < new Date()) {
        return NextResponse.json({ error: 'This code has expired' }, { status: 400 })
      }

      validatedAssociationId = codeRow.association_id

      // Look up association name (best-effort; missing name is not fatal).
      const { data: association } = await supabase
        .from('beekeeping_associations')
        .select('name')
        .eq('id', validatedAssociationId)
        .maybeSingle()
      validatedAssociationName = association?.name ?? null

      isAssociationMember = true
    }

    const priceInCents = isAssociationMember ? ASSOCIATION_PRICE_CENTS : STANDARD_PRICE_CENTS

    // Create Stripe checkout session.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'HiveCraic Annual Subscription',
              description: isAssociationMember
                ? `Irish Beekeeping Association Member Rate${validatedAssociationName ? ` - ${validatedAssociationName}` : ''}`
                : 'Standard Rate - 12 Months Access',
              images: [`${APP_URL}/logo.png`],
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${APP_URL}/dashboard/profile?payment=success`,
      cancel_url: `${APP_URL}/dashboard/profile?payment=cancelled`,
      customer_email: profile.email,
      metadata: {
        userId: user.id,
        isAssociationMember: isAssociationMember.toString(),
        associationId: validatedAssociationId || '',
        associationName: validatedAssociationName || '',
        associationCode: associationCode || '',
        subscriptionType: 'credit_card',
        priceEur: (priceInCents / 100).toString()
      },
    })

    console.warn(`[AUDIT] Stripe checkout session created: user=${user.id} session=${session.id} price_cents=${priceInCents} association_member=${isAssociationMember} association_id=${validatedAssociationId ?? 'null'} code=${associationCode ?? 'null'} timestamp=${new Date().toISOString()}`)

    return NextResponse.json({
      sessionId: session.id,
      url: session.url
    })

  } catch (error) {
    console.error('Stripe Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
