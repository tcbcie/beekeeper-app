import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { renderInvoicePdf, type InvoicePdfData } from '@/components/crm/InvoicePdf'
import type { ProductType } from '@/types/crm'

// @react-pdf/renderer needs the Node runtime (not Edge).
export const runtime = 'nodejs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const RESEND_API_KEY = process.env.RESEND_API_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('invoice-email: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Pragmatic single-@ check — full RFC validation belongs to the mail server.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function joinAddress(c: Record<string, unknown>): string | null {
  const parts = [c.address_line1, c.address_line2, c.city, c.county, c.postcode, c.country]
    .map((p) => (typeof p === 'string' ? p.trim() : '')).filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

export async function POST(request: NextRequest) {
  try {
    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email is not configured' }, { status: 503 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('subscription_expires_at, is_active, first_name, last_name, producer_address, email, mobile_number, breeder_code, is_uk_ni_resident')
      .eq('id', user.id)
      .single()
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    if (profile.is_active === false) {
      return NextResponse.json({ error: 'Account is not active', code: 'ACCOUNT_INACTIVE' }, { status: 403 })
    }
    const expiresAt = profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : null
    const hasActiveSubscription = expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt > new Date()
    if (!hasActiveSubscription) {
      return NextResponse.json({ error: 'Premium subscription required', code: 'SUBSCRIPTION_REQUIRED' }, { status: 403 })
    }

    // Parse + validate the request body.
    let orderId: unknown, recipientEmail: unknown
    try {
      const body = await request.json()
      orderId = body?.orderId
      recipientEmail = body?.recipientEmail
    } catch {
      return NextResponse.json({ error: 'Malformed request body' }, { status: 400 })
    }
    if (typeof orderId !== 'string' || !orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }
    if (typeof recipientEmail !== 'string' || !EMAIL_RE.test(recipientEmail.trim())) {
      return NextResponse.json({ error: 'A valid recipient email is required' }, { status: 400 })
    }
    const to = recipientEmail.trim()

    // Load the order + items + customer, scoped to the authenticated user so a
    // crafted orderId cannot reach another account's data.
    const { data: order } = await supabaseAdmin
      .from('crm_orders').select('*').eq('id', orderId).eq('user_id', user.id).maybeSingle()
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    const [{ data: itemRows }, { data: customer }] = await Promise.all([
      supabaseAdmin.from('crm_order_items').select('*').eq('order_id', orderId).eq('user_id', user.id).order('created_at'),
      supabaseAdmin.from('crm_customers').select('*').eq('id', order.customer_id).eq('user_id', user.id).maybeSingle(),
    ])

    const sellerName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'HiveCraic Beekeeper'

    const data: InvoicePdfData = {
      isUkNi: !!profile.is_uk_ni_resident,
      order: {
        order_number: order.order_number,
        order_date: order.order_date,
        due_date: order.due_date ?? null,
        status: order.status,
        payment_status: order.payment_status,
        total_amount: Number(order.total_amount) || 0,
        amount_paid: Number(order.amount_paid) || 0,
        notes: order.notes ?? null,
      },
      seller: {
        name: sellerName,
        address: profile.producer_address || null,
        email: profile.email || null,
        phone: profile.mobile_number || null,
        breederCode: profile.breeder_code || null,
      },
      customer: {
        name: customer?.name || 'Customer',
        company: customer?.company || null,
        email: customer?.email || null,
        phone: customer?.phone || null,
        address: customer ? joinAddress(customer) : null,
      },
      items: (itemRows || []).map((i) => ({
        product_type: i.product_type as ProductType,
        description: i.description ?? null,
        quantity: Number(i.quantity) || 0,
        unit_price: Number(i.unit_price) || 0,
      })),
    }

    let pdfBase64: string
    try {
      const buffer = await renderInvoicePdf(data)
      pdfBase64 = buffer.toString('base64')
    } catch (err) {
      console.error('invoice-email: PDF generation failed:', err)
      return NextResponse.json({ error: 'Failed to generate the invoice PDF' }, { status: 500 })
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'HiveCraic <info@hivecraic.com>',
        to: [to],
        reply_to: profile.email || undefined,
        subject: `Invoice ${order.order_number} from ${sellerName}`,
        html: `<p>Hello,</p><p>Please find attached invoice <strong>${order.order_number}</strong> from ${sellerName}.</p><p>Thank you for your business.</p>`,
        text: `Hello,\n\nPlease find attached invoice ${order.order_number} from ${sellerName}.\n\nThank you for your business.`,
        attachments: [{ filename: `${order.order_number}.pdf`, content: pdfBase64 }],
      }),
    })

    if (!resendResponse.ok) {
      const detail = await resendResponse.text()
      console.error('invoice-email: Resend error:', detail)
      return NextResponse.json({ error: 'Failed to send the email' }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('invoice-email error:', err)
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}
