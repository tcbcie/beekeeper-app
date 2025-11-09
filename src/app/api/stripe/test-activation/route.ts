import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// THIS IS A TEST ENDPOINT - REMOVE IN PRODUCTION
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, isAssociationMember, associationId, priceEur } = body

    console.log('🧪 TEST: Manually testing subscription activation')
    console.log('Input:', { userId, isAssociationMember, associationId, priceEur })

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Call the database function to activate subscription
    console.log('📞 Calling activate_credit_card_subscription...')
    const { data, error } = await supabase.rpc('activate_credit_card_subscription', {
      p_user_id: userId,
      p_stripe_payment_intent_id: 'test_manual_activation_' + Date.now(),
      p_is_association_member: isAssociationMember || false,
      p_association_id: associationId || null,
      p_price_paid: priceEur || 24.00
    })

    if (error) {
      console.error('❌ Error:', error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error,
          hint: error.hint || 'Check if the database function exists and has correct permissions'
        },
        { status: 500 }
      )
    }

    console.log('✅ Success:', data)

    // Fetch updated profile to verify
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_type, subscription_price, subscription_expires_at, is_association_member')
      .eq('id', userId)
      .single()

    return NextResponse.json({
      success: true,
      message: 'Subscription activated successfully',
      functionResult: data,
      updatedProfile: profile
    })

  } catch (error) {
    console.error('❌ Test endpoint error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
