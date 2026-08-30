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
import { orderBalance, isPartiallyPaid, isOverdue, summariseCustomerOrders } from '@/lib/crm-orders'
import { creditBalance, appliedCreditForOrder, overpaymentForOrder } from '@/lib/crm-credit'
import type { Customer, Order, OrderItem, OrderItemFormData, CustomerCreditEntry } from '@/types/crm'
import { TYPE_LABELS, COLOUR_DOTS, formatDateIrish } from '@/components/batches/graftConstants'
import { getQueenColorFromYear } from '@/types/queen'

const today = () => new Date().toISOString().slice(0, 10)

// A queen/cell distribution recorded against this order (informational link), with the
// provenance a customer actually cares about: her breeder, where she mated, her marking,
// her age and her weight. The internal cell number is only a fallback identifier.
interface LinkedDistribution {
  id: string
  distribution_type: 'queen_cell' | 'virgin_queen' | 'mated_queen'
  distribution_date: string
  cell_number: number | null
  recipient: string | null
  marked: boolean
  queen_number: string | null
  marking_colour: string
  marked_at: string | null
  breeder_queen: string | null
  breeder_birth_date: string | null
  mated_at: string | null
  emerged_at: string | null
  weight_mg: number | null
  batch_name: string | null
}

/**
 * PostgREST returns a to-one embed as a single object at runtime even though the typings
 * suggest an array, so every embed is funnelled through here rather than trusting a shape.
 */
function firstOf<T>(value: unknown): T | null {
  if (value == null) return null
  return (Array.isArray(value) ? (value[0] as T | undefined) ?? null : (value as T))
}

function allOf<T>(value: unknown): T[] {
  if (value == null) return []
  return Array.isArray(value) ? (value as T[]) : [value as T]
}

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
  const [dueDateInput, setDueDateInput] = useState('')
  const [distributions, setDistributions] = useState<LinkedDistribution[]>([])
  const [creditEntries, setCreditEntries] = useState<CustomerCreditEntry[]>([])
  const [applyCreditInput, setApplyCreditInput] = useState('')

  const load = useCallback(async (uid: string) => {
    const [orderRes, itemsRes, profileRes, distRes] = await Promise.all([
      supabase.from('crm_orders').select('*').eq('id', id).eq('user_id', uid).maybeSingle(),
      supabase.from('crm_order_items').select('*').eq('order_id', id).eq('user_id', uid).order('created_at'),
      supabase.from('profiles').select('is_uk_ni_resident').eq('id', uid).maybeSingle(),
      supabase
        .from('graft_distributions')
        .select(`id, distribution_type, distribution_date, mating_location, external_recipient_name,
          graft:batch_grafts!graft_distributions_graft_id_fkey(
            cell_number, queen_marked, queen_number,
            breeder:queens!batch_grafts_breeder_queen_id_fkey(queen_number, birth_date),
            nuc:mating_nucs(mating_location, queen_emerged_at, queen_marked_at),
            weights:queen_weights(weight_mg, weighed_at)),
          batch:rearing_batches(batch_name, emergence_date,
            mother:queens!mother_queen_id(queen_number, birth_date)),
          recipient:profiles!graft_distributions_recipient_profile_id_fkey(full_name, email)`)
        .eq('crm_order_id', id).eq('user_id', uid)
        .order('distribution_date', { ascending: false }),
    ])

    if (orderRes.error || !orderRes.data) {
      toast.error('Order not found')
      router.push('/dashboard/crm/orders')
      return
    }

    const ord = orderRes.data as Order
    setOrder(ord)
    setNotes(ord.notes || '')
    setDueDateInput(ord.due_date || '')
    setItems(toFormItems((itemsRes.data || []) as OrderItem[]))
    setIsUkNi(profileRes.data?.is_uk_ni_resident || false)

    setDistributions(((distRes.data || []) as Record<string, unknown>[]).map((d) => {
      const graft = firstOf<Record<string, unknown>>(d.graft)
      const batch = firstOf<{ batch_name?: string; emergence_date?: string; mother?: unknown }>(d.batch)
      const recip = firstOf<{ full_name?: string; email?: string }>(d.recipient)
      const nuc = firstOf<{ mating_location?: string; queen_emerged_at?: string; queen_marked_at?: string }>(graft?.nuc)
      // Per-cell breeder wins for multi-breeder batches; single-breeder and legacy cells
      // fall back to the batch mother queen (same rule as useGraftDistributions).
      const breeder = firstOf<{ queen_number?: string; birth_date?: string }>(graft?.breeder)
        ?? firstOf<{ queen_number?: string; birth_date?: string }>(batch?.mother)
      // Most recent weighing, when the queen was ever weighed. Copied before sorting so the
      // raw response array is never mutated in place.
      const latestWeight = allOf<{ weight_mg?: number; weighed_at?: string }>(graft?.weights)
        .slice()
        .sort((a, b) => (b.weighed_at || '').localeCompare(a.weighed_at || ''))[0]
      // The marking colour is set by the year she emerged, exactly as on the mating-nuc card,
      // which also treats a marking date on the nuc as proof she was marked.
      const colourSource = (batch?.emergence_date || nuc?.queen_emerged_at) ?? null
      const isMarked = !!(graft?.queen_marked || nuc?.queen_marked_at)

      return {
        id: d.id as string,
        distribution_type: d.distribution_type as LinkedDistribution['distribution_type'],
        distribution_date: d.distribution_date as string,
        cell_number: (graft?.cell_number as number | undefined) ?? null,
        recipient: (d.external_recipient_name as string | null)
          || recip?.full_name
          || recip?.email
          || 'App user',
        marked: isMarked,
        queen_number: isMarked ? ((graft?.queen_number as string | null) || null) : null,
        marking_colour: isMarked && colourSource ? getQueenColorFromYear(colourSource) : '',
        marked_at: isMarked ? (nuc?.queen_marked_at ?? null) : null,
        breeder_queen: breeder?.queen_number ?? null,
        breeder_birth_date: breeder?.birth_date ?? null,
        // The distribution records where she actually mated; the nuc's site is the fallback.
        mated_at: (d.mating_location as string | null) || nuc?.mating_location || null,
        emerged_at: nuc?.queen_emerged_at ?? batch?.emergence_date ?? null,
        weight_mg: latestWeight?.weight_mg ?? null,
        batch_name: batch?.batch_name ?? null,
      }
    }))

    const [custRes, custOrdersRes, creditRes] = await Promise.all([
      supabase.from('crm_customers').select('*').eq('id', ord.customer_id).eq('user_id', uid).maybeSingle(),
      supabase.from('crm_orders').select('status, total_amount, amount_paid').eq('customer_id', ord.customer_id).eq('user_id', uid),
      supabase.from('crm_customer_credit').select('*').eq('customer_id', ord.customer_id).eq('user_id', uid),
    ])
    setCustomer((custRes.data as Customer) || null)
    setCustomerStats(summariseCustomerOrders((custOrdersRes.data || []) as Order[]))
    const entries = (creditRes.data || []) as CustomerCreditEntry[]
    setCreditEntries(entries)
    // Show the GROSS amount paid (capped amount_paid + any surplus this order
    // swept to credit) so the field reflects reality and re-submitting the same
    // value is idempotent — it must not silently erase the overpayment credit.
    const grossPaid = (Number(ord.amount_paid) || 0) + overpaymentForOrder(entries, ord.id)
    setAmountPaidInput(grossPaid.toFixed(2))
    // Default the "apply credit" amount to the most that can be applied here.
    setApplyCreditInput(Math.min(creditBalance(entries), orderBalance(ord)).toFixed(2))
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

  // Records a specific amount paid (deposit / partial / full). The order keeps
  // amount_paid in [0, total]; any surplus is swept to the customer's credit.
  const handleSetAmountPaid = async () => {
    if (!userId || !order) return
    const amount = parseFloat(amountPaidInput)
    if (!Number.isFinite(amount) || amount < 0) { toast.warning('Enter a valid amount'); return }
    const total = Number(order.total_amount) || 0
    const surplus = amount > total ? amount - total : 0
    setBusy(true)
    try {
      const { error } = await supabase.rpc('crm_set_order_amount_paid', {
        p_order_id: order.id,
        p_amount: amount,
      })
      if (error) throw error
      toast.success(surplus > 0
        ? `Recorded ${formatMoney(total, isUkNi)} paid — ${formatMoney(surplus, isUkNi)} added as credit to ${customer?.name ?? 'the customer'}'s account`
        : 'Payment updated')
      load(userId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update payment')
    } finally {
      setBusy(false)
    }
  }

  // Applies the customer's stored credit to this order. The server caps it at
  // the available balance and the order's remaining balance in one transaction.
  const handleApplyCredit = async () => {
    if (!userId || !order) return
    const amount = parseFloat(applyCreditInput)
    if (!Number.isFinite(amount) || amount <= 0) { toast.warning('Enter a valid amount'); return }
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('crm_apply_credit_to_order', {
        p_order_id: order.id,
        p_amount: amount,
      })
      if (error) throw error
      const applied = Number(data) || 0
      toast.success(`Applied ${formatMoney(applied, isUkNi)} from credit`)
      load(userId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to apply credit')
    } finally {
      setBusy(false)
    }
  }

  const handleSetDueDate = async (value: string) => {
    if (!userId || !order) return
    setDueDateInput(value)
    const { error } = await supabase
      .from('crm_orders')
      .update({ due_date: value || null })
      .eq('id', order.id).eq('user_id', userId)
    if (error) {
      toast.error('Failed to update due date')
    } else {
      setOrder({ ...order, due_date: value || null })
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
  const availableCredit = creditBalance(creditEntries)
  const overpaidFromThis = overpaymentForOrder(creditEntries, order.id)
  const appliedToThis = appliedCreditForOrder(creditEntries, order.id)
  const remaining = orderBalance(order)
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
            {appliedToThis > 0 && (
              <span className="text-text-secondary">From credit: <span className="font-medium text-forest-700 dark:text-forest-400 tabular-nums">{formatMoney(appliedToThis, isUkNi)}</span></span>
            )}
            {overpaidFromThis > 0 && (
              <span className="text-text-secondary">Overpaid → credit: <span className="font-medium text-forest-700 dark:text-forest-400 tabular-nums">{formatMoney(overpaidFromThis, isUkNi)}</span></span>
            )}
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
            <div>
              <FieldLabel>Due date</FieldLabel>
              <TextInput
                type="date"
                value={dueDateInput}
                min={order.order_date}
                onChange={(e) => handleSetDueDate(e.target.value)}
                className="rounded-md w-44"
              />
            </div>
          </div>
          {availableCredit > 0 && remaining > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <p className="text-sm text-text-secondary mb-2">
                {customer?.name ?? 'This customer'} has <span className="font-semibold text-forest-700 dark:text-forest-400">{formatMoney(availableCredit, isUkNi)}</span> credit available.
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <FieldLabel>Apply from credit</FieldLabel>
                  <TextInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={applyCreditInput}
                    onChange={(e) => setApplyCreditInput(e.target.value)}
                    className="rounded-md w-40"
                  />
                </div>
                <Button onClick={handleApplyCredit} tone="success" disabled={busy} className="min-h-[48px]">
                  Apply credit
                </Button>
              </div>
            </div>
          )}
          {isOverdue(order, today()) && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">
              Overdue — {formatMoney(orderBalance(order), isUkNi)} was due by {formatCrmDate(order.due_date)}.
            </p>
          )}
          <p className="text-xs text-text-tertiary mt-2">
            Record a deposit or part payment here. Overpayments are kept as customer credit. Income is recognised in your ledger only once the full amount is paid.
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

      {/* Distributions recorded against this order (read-only) */}
      {distributions.length > 0 && (
        <Panel padding="lg">
          <h3 className="text-xl font-semibold text-foreground mb-3">Distributions linked to this order</h3>
          <ul className="divide-y divide-border">
            {distributions.map((d) => (
              <DistributionRow key={d.id} d={d} />
            ))}
          </ul>
        </Panel>
      )}
    </div>
  )
}

/** One labelled detail pair. Renders nothing when the value is missing, so an incomplete
 *  record simply shows fewer rows rather than a wall of placeholders. */
function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  // Falsy covers null, '' and the `false` a short-circuited `&&` expression produces.
  if (!children) return null
  return (
    <div className="flex flex-wrap gap-x-2">
      <span className="text-text-tertiary">{label}</span>
      <span className="font-medium text-foreground">{children}</span>
    </div>
  )
}

/** A linked distribution, showing the queen's provenance rather than her internal cell number. */
function DistributionRow({ d }: { d: LinkedDistribution }) {
  // Once she is marked, her marking number identifies her; the cell number is only a fallback.
  const title = d.queen_number
    ? `Queen #${d.queen_number}`
    : d.cell_number != null ? `Cell #${d.cell_number}` : 'Queen'

  return (
    <li className="py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="font-medium text-foreground">
          {title}
          <span className="ml-2 font-normal text-text-secondary">
            {TYPE_LABELS[d.distribution_type]?.label || d.distribution_type}
          </span>
        </span>
        <span className="text-text-secondary">
          {d.recipient} · {formatCrmDate(d.distribution_date)}
        </span>
      </div>

      {/* Gated on the marking itself, not the colour, so an unknown emergence year can never
          swallow the queen's number. The colour is always named in text beside the dot. */}
      {d.marked && (
        <p className="mt-1 flex items-center gap-1.5 text-text-secondary">
          {COLOUR_DOTS[d.marking_colour] && (
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${COLOUR_DOTS[d.marking_colour]}`} />
          )}
          Marked{d.marking_colour && ` ${d.marking_colour}`}
          {d.queen_number && ` #${d.queen_number}`}
          {d.marked_at && ` · ${formatDateIrish(d.marked_at)}`}
        </p>
      )}

      <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
        <Detail label="Breeder Queen">
          {d.breeder_queen && `${d.breeder_queen}${d.breeder_birth_date ? ` (b. ${formatDateIrish(d.breeder_birth_date)})` : ''}`}
        </Detail>
        <Detail label="Mated at">{d.mated_at}</Detail>
        <Detail label="Emerged">{d.emerged_at && formatDateIrish(d.emerged_at)}</Detail>
        <Detail label="Batch">{d.batch_name}</Detail>
        <Detail label="Weight">{d.weight_mg != null && `${d.weight_mg} mg`}</Detail>
      </div>
    </li>
  )
}
