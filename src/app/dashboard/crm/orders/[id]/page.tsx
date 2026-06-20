'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { ArrowLeft, Save, Trash2, CheckCircle, RotateCcw, Ban, FileText } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import FieldLabel from '@/components/ui/FieldLabel'
import TextInput from '@/components/ui/TextInput'
import TextAreaField from '@/components/ui/TextAreaField'
import Button from '@/components/ui/Button'
import Panel from '@/components/ui/Panel'
import { useToast } from '@/components/ui/Toast'
import OrderItemsEditor from '@/components/crm/OrderItemsEditor'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/crm/OrderBadges'
import { formatMoney } from '@/lib/crm-currency'
import { formatCrmDate } from '@/lib/crm-format'
import { orderBalance, isPartiallyPaid, summariseCustomerOrders } from '@/lib/crm-orders'
import type { Customer, Order, OrderItem, OrderItemFormData } from '@/types/crm'

const today = () => new Date().toISOString().slice(0, 10)

function toFormItems(items: OrderItem[]): OrderItemFormData[] {
  return items.map((i) => ({
    product_type: i.product_type,
    description: i.description || '',
    quantity: Number(i.quantity),
    unit_price: Number(i.unit_price),
  }))
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const toast = useToast()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [customerStats, setCustomerStats] = useState({ count: 0, lifetime: 0, outstanding: 0 })
  const [items, setItems] = useState<OrderItemFormData[]>([])
  const [notes, setNotes] = useState('')
  const [isUkNi, setIsUkNi] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [amountPaidInput, setAmountPaidInput] = useState('')

  const load = useCallback(async (uid: string) => {
    const [orderRes, itemsRes, profileRes] = await Promise.all([
      supabase.from('crm_orders').select('*').eq('id', id).eq('user_id', uid).maybeSingle(),
      supabase.from('crm_order_items').select('*').eq('order_id', id).eq('user_id', uid).order('created_at'),
      supabase.from('profiles').select('is_uk_ni_resident').eq('id', uid).maybeSingle(),
    ])

    if (orderRes.error || !orderRes.data) {
      toast.error('Order not found')
      router.push('/dashboard/crm/orders')
      return
    }

    const ord = orderRes.data as Order
    setOrder(ord)
    setNotes(ord.notes || '')
    setAmountPaidInput(String(Number(ord.amount_paid) || 0))
    setItems(toFormItems((itemsRes.data || []) as OrderItem[]))
    setIsUkNi(profileRes.data?.is_uk_ni_resident || false)

    const [custRes, custOrdersRes] = await Promise.all([
      supabase.from('crm_customers').select('*').eq('id', ord.customer_id).eq('user_id', uid).maybeSingle(),
      supabase.from('crm_orders').select('status, total_amount, amount_paid').eq('customer_id', ord.customer_id).eq('user_id', uid),
    ])
    setCustomer((custRes.data as Customer) || null)
    setCustomerStats(summariseCustomerOrders((custOrdersRes.data || []) as Order[]))
    setLoading(false)
  }, [id, router, toast])

  useEffect(() => {
    const init = async () => {
      const uid = await getCurrentUserId()
      if (!uid) { router.push('/login'); return }
      setUserId(uid)
      load(uid)
    }
    init()
  }, [router, load])

  // Persist line items + notes atomically; re-posts revenue if already paid.
  const handleSave = async () => {
    if (!userId || !order) return
    const validItems = items.filter((i) => Number(i.quantity) > 0)
    if (validItems.length === 0) { toast.warning('Add at least one line item with a quantity'); return }

    setBusy(true)
    try {
      const { error } = await supabase.rpc('crm_save_order_items', {
        p_order_id: order.id,
        p_items: validItems,
        p_notes: notes.trim() || null,
      })
      if (error) throw error
      toast.success('Order saved')
      load(userId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save order')
    } finally {
      setBusy(false)
    }
  }

  const handleFulfil = async (fulfil: boolean) => {
    if (!userId || !order) return
    setBusy(true)
    try {
      const { error } = await supabase
        .from('crm_orders')
        .update({ status: fulfil ? 'fulfilled' : 'pending', fulfilled_date: fulfil ? today() : null })
        .eq('id', order.id).eq('user_id', userId)
      if (error) throw error
      toast.success(fulfil ? 'Order marked fulfilled' : 'Order reopened')
      load(userId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update order')
    } finally {
      setBusy(false)
    }
  }

  const handlePayment = async (paid: boolean) => {
    if (!userId || !order) return
    setBusy(true)
    try {
      const { error } = await supabase.rpc('crm_set_order_payment', {
        p_order_id: order.id,
        p_paid: paid,
      })
      if (error) throw error
      toast.success(paid
        ? 'Marked paid — income added to your ledger'
        : 'Marked unpaid — income removed from your ledger')
      load(userId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update payment')
    } finally {
      setBusy(false)
    }
  }

  // Records a specific amount paid (deposit / partial / full). The server
  // clamps to [0, total] and recognises income only once fully paid.
  const handleSetAmountPaid = async () => {
    if (!userId || !order) return
    const amount = parseFloat(amountPaidInput)
    if (!Number.isFinite(amount) || amount < 0) { toast.warning('Enter a valid amount'); return }
    const total = Number(order.total_amount) || 0
    const capped = amount > total
    setBusy(true)
    try {
      const { error } = await supabase.rpc('crm_set_order_amount_paid', {
        p_order_id: order.id,
        p_amount: amount,
      })
      if (error) throw error
      // The server clamps to the order total — tell the user when that happens.
      toast.success(capped
        ? `Amount exceeded the total — recorded the full ${formatMoney(total, isUkNi)} as paid`
        : 'Payment updated')
      load(userId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update payment')
    } finally {
      setBusy(false)
    }
  }

  const handleCancel = async () => {
    if (!userId || !order) return
    if (!confirm('Cancel this order? Any income recognised for it will be removed from your ledger.')) return
    setBusy(true)
    try {
      const { error } = await supabase.rpc('crm_cancel_order', { p_order_id: order.id })
      if (error) throw error
      toast.success('Order cancelled')
      load(userId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel order')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!userId || !order) return
    if (!confirm('Delete this order? Recognised income stays in your ledger — mark it Unpaid or Cancel first if you want it removed.')) return
    setBusy(true)
    try {
      // Income rows survive via ON DELETE SET NULL (recognised revenue is kept
      // as historical fact). Use Unpaid/Cancel to un-recognise instead.
      const { error } = await supabase.from('crm_orders').delete().eq('id', order.id).eq('user_id', userId)
      if (error) throw error
      toast.success('Order deleted')
      router.push('/dashboard/crm/orders')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete order')
      setBusy(false)
    }
  }

  if (loading || !order) return <LoadingSpinner text="Loading order..." />

  const isCancelled = order.status === 'cancelled'
  const addressParts = customer ? [
    customer.address_line1, customer.address_line2, customer.city,
    customer.county, customer.postcode, customer.country,
  ].filter(Boolean) : []

  return (
    <div className="space-y-6">
      <Link href="/dashboard/crm/orders" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-foreground">
        <ArrowLeft size={16} /> Back to Orders
      </Link>

      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{order.order_number}</h1>
          <p className="text-sm text-text-tertiary">{formatCrmDate(order.order_date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.payment_status} partial={isPartiallyPaid(order)} />
        </div>
      </div>

      {/* Customer */}
      {customer && (
        <Panel padding="md">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <Link href={`/dashboard/crm/customers/${customer.id}`} className="text-lg font-semibold text-foreground hover:underline">
                {customer.name}
              </Link>
              {customer.company && <p className="text-sm text-text-tertiary">{customer.company}</p>}
            </div>
            <Link href={`/dashboard/crm/customers/${customer.id}`} className="text-sm text-forest-600 hover:underline whitespace-nowrap shrink-0">
              View customer →
            </Link>
          </div>
          {(customer.email || customer.phone || addressParts.length > 0) && (
            <div className="text-sm text-text-secondary space-y-1">
              {customer.email && <p>{customer.email}</p>}
              {customer.phone && <p>{customer.phone}</p>}
              {addressParts.length > 0 && <p>{addressParts.join(', ')}</p>}
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm border-t border-border pt-2 mt-3">
            <span className="text-text-secondary">Orders: <span className="font-medium text-foreground tabular-nums">{customerStats.count}</span></span>
            <span className="text-text-secondary">Lifetime: <span className="font-medium text-foreground tabular-nums">{formatMoney(customerStats.lifetime, isUkNi)}</span></span>
            <span className="text-text-secondary">Outstanding: <span className="font-medium text-foreground tabular-nums">{formatMoney(customerStats.outstanding, isUkNi)}</span></span>
          </div>
        </Panel>
      )}

      {/* Payment */}
      {!isCancelled && (
        <Panel padding="md">
          <h3 className="font-semibold text-foreground mb-3">Payment</h3>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm mb-3">
            <span className="text-text-secondary">Total: <span className="font-medium text-foreground tabular-nums">{formatMoney(Number(order.total_amount), isUkNi)}</span></span>
            <span className="text-text-secondary">Paid: <span className="font-medium text-foreground tabular-nums">{formatMoney(Number(order.amount_paid), isUkNi)}</span></span>
            <span className="text-text-secondary">Balance: <span className="font-medium text-foreground tabular-nums">{formatMoney(orderBalance(order), isUkNi)}</span></span>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <FieldLabel>Amount paid</FieldLabel>
              <TextInput
                type="number"
                min="0"
                step="0.01"
                value={amountPaidInput}
                onChange={(e) => setAmountPaidInput(e.target.value)}
                className="rounded-md w-40"
              />
            </div>
            <Button onClick={handleSetAmountPaid} tone="blue" disabled={busy} className="min-h-[48px]">
              Record payment
            </Button>
          </div>
          <p className="text-xs text-text-tertiary mt-2">
            Record a deposit or part payment here. Income is recognised in your ledger only once the full amount is paid.
          </p>
        </Panel>
      )}

      {/* Actions */}
      <Panel padding="md">
        <h3 className="font-semibold text-foreground mb-3">Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => router.push(`/dashboard/crm/orders/${order.id}/invoice`)} tone="neutral">
            <FileText size={16} /> Invoice
          </Button>
          {order.status !== 'fulfilled' && !isCancelled && (
            <Button onClick={() => handleFulfil(true)} tone="success" disabled={busy}>
              <CheckCircle size={16} /> Mark Fulfilled
            </Button>
          )}
          {order.status === 'fulfilled' && (
            <Button onClick={() => handleFulfil(false)} tone="neutral" disabled={busy}>
              <RotateCcw size={16} /> Reopen
            </Button>
          )}
          {order.payment_status === 'unpaid' && !isCancelled && (
            <Button onClick={() => handlePayment(true)} tone="blue" disabled={busy}>
              <CheckCircle size={16} /> Mark Paid
            </Button>
          )}
          {order.payment_status === 'paid' && (
            <Button onClick={() => handlePayment(false)} tone="amber" disabled={busy}>
              <RotateCcw size={16} /> Mark Unpaid
            </Button>
          )}
          {!isCancelled && (
            <Button onClick={handleCancel} tone="neutral" disabled={busy}>
              <Ban size={16} /> Cancel Order
            </Button>
          )}
          <Button onClick={handleDelete} tone="danger" disabled={busy}>
            <Trash2 size={16} /> Delete
          </Button>
        </div>
        {order.payment_status === 'paid' && (
          <p className="text-xs text-text-tertiary mt-3">
            Revenue for this order has been recognised in your income/expense ledger by product category.
          </p>
        )}
      </Panel>

      {/* Line items */}
      <Panel padding="lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-semibold text-foreground">Items</h3>
          <span className="text-sm text-text-tertiary">Order total: {formatMoney(Number(order.total_amount), isUkNi)}</span>
        </div>

        {isCancelled ? (
          <p className="text-sm text-text-tertiary">This order is cancelled and can no longer be edited.</p>
        ) : (
          <>
            <OrderItemsEditor items={items} onChange={setItems} isUkNi={isUkNi} />
            <div className="mt-4">
              <FieldLabel>Notes</FieldLabel>
              <TextAreaField
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="rounded-md"
              />
            </div>
            <div className="mt-4">
              <Button onClick={handleSave} tone="success" disabled={busy} className="min-h-[48px] px-6">
                <Save size={16} /> Save Changes
              </Button>
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}
