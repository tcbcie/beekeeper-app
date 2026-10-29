'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { firstOf } from '@/lib/embed'
import { useSubmitLock } from '@/hooks/useSubmitLock'
import { getCurrentUserId } from '@/lib/auth'
import { ArrowLeft, Printer, Mail } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Button from '@/components/ui/Button'
import ModalShell from '@/components/ui/ModalShell'
import FieldLabel from '@/components/ui/FieldLabel'
import SelectField from '@/components/ui/SelectField'
import { useToast } from '@/components/ui/Toast'
import { formatMoney } from '@/lib/crm-currency'
import { formatCrmDate } from '@/lib/crm-format'
import { orderBalance, isPartiallyPaid } from '@/lib/crm-orders'
import { PRODUCT_TYPE_LABELS } from '@/types/crm'
import type { Customer, Order, OrderItem } from '@/types/crm'

interface Seller {
  name: string
  address: string | null
  email: string | null
  phone: string | null
  breederCode: string | null
}

export default function OrderInvoicePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()
  const [order, setOrder] = useState<Order | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [seller, setSeller] = useState<Seller | null>(null)
  const [isUkNi, setIsUkNi] = useState(false)
  const [loading, setLoading] = useState(true)
  const [emailOpen, setEmailOpen] = useState(false)
  const [recipient, setRecipient] = useState('')
  // One send at a time: a double tap must not email the invoice twice.
  const { submitting: sending, run } = useSubmitLock()

  const load = useCallback(async (uid: string) => {
    const [orderRes, itemsRes, profileRes] = await Promise.all([
      // The customer comes with the order (one link, same owner) instead of a second round trip.
      supabase.from('crm_orders').select('*, customer:crm_customers(*)').eq('id', id).eq('user_id', uid).maybeSingle(),
      supabase.from('crm_order_items').select('*').eq('order_id', id).eq('user_id', uid).order('created_at'),
      supabase.from('profiles').select('first_name, last_name, producer_address, email, mobile_number, breeder_code, is_uk_ni_resident').eq('id', uid).maybeSingle(),
    ])

    if (orderRes.error || !orderRes.data) {
      router.push('/dashboard/crm/orders')
      return
    }

    const { customer: cust, ...ord } = orderRes.data as Omit<Order, 'customer'> & { customer: Customer | Customer[] | null }
    setOrder(ord)
    setCustomer(firstOf<Customer>(cust) ?? null)
    setItems((itemsRes.data || []) as OrderItem[])

    const p = profileRes.data
    if (p) {
      setIsUkNi(p.is_uk_ni_resident || false)
      setSeller({
        name: [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Beekeeper',
        address: p.producer_address || null,
        email: p.email || null,
        phone: p.mobile_number || null,
        breederCode: p.breeder_code || null,
      })
    }

    setLoading(false)
  }, [id, router])

  useEffect(() => {
    const init = async () => {
      const uid = await getCurrentUserId()
      if (!uid) { router.push('/login'); return }
      load(uid)
    }
    init()
  }, [router, load])

  // The server only sends to the customer's saved email or to the seller (a copy).
  const customerEmail = customer?.email?.trim() || ''
  const sellerEmail = seller?.email?.trim() || ''
  const showSellerOption = !!sellerEmail && sellerEmail.toLowerCase() !== customerEmail.toLowerCase()

  const openEmail = () => {
    setRecipient(customerEmail || sellerEmail)
    setEmailOpen(true)
  }

  const handleSendEmail = () => {
    void run(sendInvoiceEmail)
  }

  const sendInvoiceEmail = async () => {
    if (!order) return
    const to = recipient.trim()
    if (!to) { toast.warning('Add an email address to the customer first'); return }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { toast.error('Your session has expired — please sign in again'); return }
      const res = await fetch('/api/crm/invoice-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orderId: order.id, recipientEmail: to }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result?.error || 'Failed to send the invoice')
      toast.success(`Invoice emailed to ${to}`)
      setEmailOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send the invoice')
    }
  }

  if (loading || !order) return <LoadingSpinner text="Loading invoice..." />

  const addressParts = customer ? [
    customer.address_line1, customer.address_line2, customer.city,
    customer.county, customer.postcode, customer.country,
  ].filter(Boolean) : []

  return (
    <div className="space-y-6">
      {/* On-screen controls — hidden when printing */}
      <div className="flex items-center justify-between gap-3 no-print">
        <Link href={`/dashboard/crm/orders/${order.id}`} className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-foreground">
          <ArrowLeft size={16} /> Back to Order
        </Link>
        <div className="flex gap-2">
          <Button onClick={openEmail} tone="success" className="min-h-[48px]">
            <Mail size={16} /> Email invoice
          </Button>
          <Button onClick={() => window.print()} tone="blue" className="min-h-[48px]">
            <Printer size={16} /> Print / Save as PDF
          </Button>
        </div>
      </div>

      {emailOpen && (
        <ModalShell
          title="Email invoice"
          onClose={() => (sending ? undefined : setEmailOpen(false))}
          closeDisabled={sending}
          closeOnBackdrop
          footer={
            <div className="border-t border-border px-6 py-4 flex justify-end gap-3">
              <Button onClick={() => setEmailOpen(false)} tone="neutral" disabled={sending} className="min-h-12 px-5">
                Cancel
              </Button>
              <Button onClick={handleSendEmail} tone="success" disabled={sending} className="min-h-12 px-5">
                <Mail size={16} /> {sending ? 'Sending…' : 'Send'}
              </Button>
            </div>
          }
        >
          <p className="text-sm text-text-secondary mb-3">
            Send invoice <strong className="text-foreground">{order.order_number}</strong> as a PDF attachment.
          </p>
          <FieldLabel>Send to</FieldLabel>
          <SelectField
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="rounded-md"
            disabled={sending || (!customerEmail && !sellerEmail)}
          >
            {customerEmail && <option value={customerEmail}>Customer: {customerEmail}</option>}
            {showSellerOption && <option value={sellerEmail}>Myself (a copy): {sellerEmail}</option>}
            {!customerEmail && !sellerEmail && <option value="">No email address available</option>}
          </SelectField>
          {!customerEmail && (
            <p className="text-sm text-text-tertiary mt-2">
              This customer has no email on file. Add one to the customer&apos;s details to email them the invoice.
            </p>
          )}
        </ModalShell>
      )}

      <div className="print-container max-w-2xl mx-auto bg-surface-elevated rounded-xl p-6 sm:p-8 border border-border">
        {/* Heading */}
        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Invoice</h1>
            <p className="text-text-secondary">{order.order_number}</p>
          </div>
          <div className="text-sm text-text-secondary text-right">
            <p>Date: <strong className="text-foreground">{formatCrmDate(order.order_date)}</strong></p>
            {order.due_date && <p>Due: <strong className="text-foreground">{formatCrmDate(order.due_date)}</strong></p>}
            <p>Status: <strong className="text-foreground capitalize">{order.status}</strong></p>
            <p>Payment: <strong className="text-foreground capitalize">{order.payment_status}</strong></p>
          </div>
        </div>

        {/* From / To */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6 text-sm">
          <div>
            <p className="text-text-tertiary font-medium mb-1">From</p>
            <p className="font-semibold text-foreground">{seller?.name}</p>
            {seller?.address && <p className="text-text-secondary whitespace-pre-wrap">{seller.address}</p>}
            {seller?.email && <p className="text-text-secondary">{seller.email}</p>}
            {seller?.phone && <p className="text-text-secondary">{seller.phone}</p>}
            {seller?.breederCode && <p className="text-text-secondary">Breeder code: {seller.breederCode}</p>}
          </div>
          <div>
            <p className="text-text-tertiary font-medium mb-1">Bill to</p>
            <p className="font-semibold text-foreground">{customer?.name || 'Unknown customer'}</p>
            {customer?.company && <p className="text-text-secondary">{customer.company}</p>}
            {addressParts.length > 0 && <p className="text-text-secondary">{addressParts.join(', ')}</p>}
            {customer?.email && <p className="text-text-secondary">{customer.email}</p>}
            {customer?.phone && <p className="text-text-secondary">{customer.phone}</p>}
          </div>
        </div>

        {/* Line items */}
        <table className="print-table w-full text-sm mb-4">
          <thead>
            <tr className="text-left text-text-tertiary border-b border-border">
              <th className="py-2 pr-3 font-medium">Item</th>
              <th className="py-2 px-3 font-medium text-right">Qty</th>
              <th className="py-2 px-3 font-medium text-right">Unit price</th>
              <th className="py-2 pl-3 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-b border-border/60">
                <td className="py-2 pr-3 text-foreground">
                  {PRODUCT_TYPE_LABELS[i.product_type]}
                  {i.description && <span className="text-text-secondary"> — {i.description}</span>}
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-text-secondary">{Number(i.quantity)}</td>
                <td className="py-2 px-3 text-right tabular-nums text-text-secondary">{formatMoney(Number(i.unit_price), isUkNi)}</td>
                <td className="py-2 pl-3 text-right tabular-nums text-foreground">{formatMoney(Number(i.quantity) * Number(i.unit_price), isUkNi)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total */}
        <div className="flex justify-end">
          <div className="w-full sm:w-64 space-y-1">
            <div className="flex justify-between border-t border-border pt-3">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-bold text-foreground tabular-nums">{formatMoney(Number(order.total_amount), isUkNi)}</span>
            </div>
            {isPartiallyPaid(order) && (
              <>
                <div className="flex justify-between text-sm text-text-secondary">
                  <span>Paid</span>
                  <span className="tabular-nums">{formatMoney(Number(order.amount_paid), isUkNi)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium text-foreground">
                  <span>Balance due</span>
                  <span className="tabular-nums">{formatMoney(orderBalance(order), isUkNi)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {order.notes && (
          <div className="mt-6 text-sm">
            <p className="text-text-tertiary font-medium mb-1">Notes</p>
            <p className="text-text-secondary whitespace-pre-wrap">{order.notes}</p>
          </div>
        )}

        <p className="mt-8 text-sm text-text-tertiary">
          {order.payment_status === 'paid' ? 'Paid — thank you for your business.' : 'Payment due. Thank you for your business.'}
        </p>
      </div>
    </div>
  )
}
