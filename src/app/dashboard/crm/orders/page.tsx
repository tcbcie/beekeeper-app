'use client'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { Plus, X, ShoppingCart, ChevronRight, Search, PackageCheck, Banknote } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import FieldLabel from '@/components/ui/FieldLabel'
import SelectField from '@/components/ui/SelectField'
import TextInput from '@/components/ui/TextInput'
import TextAreaField from '@/components/ui/TextAreaField'
import Button from '@/components/ui/Button'
import Panel from '@/components/ui/Panel'
import { useToast } from '@/components/ui/Toast'
import OrderItemsEditor, { emptyOrderItem } from '@/components/crm/OrderItemsEditor'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/crm/OrderBadges'
import { formatMoney } from '@/lib/crm-currency'
import { formatCrmDate } from '@/lib/crm-format'
import { PRODUCT_TYPE_LABELS } from '@/types/crm'
import type { Customer, Order, OrderItemFormData, OrderStatus, ProductType } from '@/types/crm'

const today = () => new Date().toISOString().slice(0, 10)

// Local calendar date as YYYY-MM-DD — avoids the UTC shift of toISOString(),
// which can misclassify dates by a day for users behind UTC late in the day.
const localDate = (d: Date) => {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// The orders list query selects only these item fields, so the rows are NOT
// full `Order`s — typing them honestly prevents reads of absent fields.
type OrderListRow = Omit<Order, 'items'> & {
  items: { product_type: ProductType; quantity: number }[]
}

export default function OrdersPage() {
  const toast = useToast()
  const router = useRouter()
  const [orders, setOrders] = useState<OrderListRow[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [isUkNi, setIsUkNi] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all')
  const [productFilter, setProductFilter] = useState<'all' | ProductType>('all')
  const [search, setSearch] = useState('')

  const [rowBusy, setRowBusy] = useState<string | null>(null)
  // Synchronous latch: blocks a second mutation before React commits `rowBusy`
  // (the disabled prop) — guards markPaid, which recognises ledger revenue.
  const actionLock = useRef(false)

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [orderDate, setOrderDate] = useState(today())
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<OrderItemFormData[]>([emptyOrderItem()])

  const fetchData = useCallback(async (uid: string) => {
    const [ordersRes, customersRes, profileRes] = await Promise.all([
      supabase.from('crm_orders').select('*, items:crm_order_items(product_type, quantity)').eq('user_id', uid).order('order_date', { ascending: false }),
      supabase.from('crm_customers').select('id, name, company').eq('user_id', uid).order('name'),
      supabase.from('profiles').select('is_uk_ni_resident').eq('id', uid).maybeSingle(),
    ])

    if (ordersRes.error) toast.error('Failed to load orders')

    const customerList = (customersRes.data || []) as Customer[]
    setCustomers(customerList)
    setIsUkNi(profileRes.data?.is_uk_ni_resident || false)

    const nameById = new Map(customerList.map((c) => [c.id, c]))
    const enriched = ((ordersRes.data || []) as OrderListRow[]).map((o) => ({
      ...o,
      customer: nameById.get(o.customer_id) || null,
    }))
    setOrders(enriched)
    setLoading(false)
  }, [toast])

  useEffect(() => {
    const init = async () => {
      const id = await getCurrentUserId()
      if (!id) { router.push('/login'); return }
      setUserId(id)
      fetchData(id)
    }
    init()
  }, [router, fetchData])

  const resetForm = () => {
    setShowForm(false)
    setCustomerId('')
    setOrderDate(today())
    setNotes('')
    setItems([emptyOrderItem()])
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    if (!customerId) { toast.warning('Please select a customer'); return }
    const validItems = items.filter((i) => Number(i.quantity) > 0)
    if (validItems.length === 0) { toast.warning('Add at least one line item with a quantity'); return }

    setSaving(true)
    try {
      // Atomic: allocates the order number, inserts order + items in one
      // transaction, and returns the new order id.
      const { data: orderId, error } = await supabase.rpc('crm_create_order', {
        p_customer_id: customerId,
        p_order_date: orderDate,
        p_notes: notes.trim() || null,
        p_items: validItems,
      })
      if (error) throw error

      toast.success('Order created')
      resetForm()
      router.push(`/dashboard/crm/orders/${orderId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create order')
    } finally {
      setSaving(false)
    }
  }

  // Inline list actions. Fulfilment is a direct update; payment goes through the
  // atomic RPC that also recognises revenue in the ledger. Both refresh on done.
  const markFulfilled = async (orderId: string) => {
    if (!userId || actionLock.current) return
    actionLock.current = true
    setRowBusy(orderId)
    try {
      const { error } = await supabase
        .from('crm_orders')
        .update({ status: 'fulfilled', fulfilled_date: today() })
        .eq('id', orderId).eq('user_id', userId)
      if (error) throw error
      toast.success('Order marked fulfilled')
      // Patch the single row locally instead of refetching the whole list.
      setOrders((prev) => prev.map((o) =>
        o.id === orderId ? { ...o, status: 'fulfilled', fulfilled_date: today() } : o))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update order')
    } finally {
      setRowBusy(null)
      actionLock.current = false
    }
  }

  const markPaid = async (orderId: string) => {
    if (!userId || actionLock.current) return
    actionLock.current = true
    setRowBusy(orderId)
    try {
      const { error } = await supabase.rpc('crm_set_order_payment', { p_order_id: orderId, p_paid: true })
      if (error) throw error
      toast.success('Marked paid — income added to your ledger')
      // Patch the single row locally instead of refetching the whole list.
      setOrders((prev) => prev.map((o) =>
        o.id === orderId ? { ...o, payment_status: 'paid', paid_date: today() } : o))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update payment')
    } finally {
      setRowBusy(null)
      actionLock.current = false
    }
  }

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false
      if (productFilter !== 'all' && !(o.items || []).some((i) => i.product_type === productFilter)) return false
      if (q && ![o.order_number, o.customer?.name, o.customer?.company].some((f) => f?.toLowerCase().includes(q))) return false
      return true
    })
  }, [orders, statusFilter, productFilter, search])

  const filteredTotal = useMemo(
    () => filteredOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0),
    [filteredOrders],
  )

  // Accounts receivable: money owed across unpaid, non-cancelled orders.
  // Cancelled orders are forced unpaid but carry no recognised revenue, so they
  // are never "owed". Orders whose date is over 30 days ago are flagged overdue.
  const outstanding = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    const cutoffStr = localDate(cutoff)
    let total = 0, count = 0, overdue = 0
    for (const o of orders) {
      if (o.status === 'cancelled' || o.payment_status !== 'unpaid') continue
      total += Number(o.total_amount) || 0
      count += 1
      if (o.order_date && o.order_date < cutoffStr) overdue += 1
    }
    return { total, count, overdue }
  }, [orders])

  // Open (pending) orders broken down by product type, for fulfilment planning.
  // An order is counted once per distinct product type it contains; units sum
  // the quantities of that type across all open orders.
  const openSummary = useMemo(() => {
    const acc = {} as Record<ProductType, { orders: number; units: number }>
    for (const o of orders) {
      if (o.status !== 'pending') continue
      const seen = new Set<ProductType>()
      for (const i of o.items || []) {
        const t = i.product_type
        if (!acc[t]) acc[t] = { orders: 0, units: 0 }
        acc[t].units += Number(i.quantity) || 0
        seen.add(t)
      }
      for (const t of seen) acc[t].orders += 1
    }
    return (Object.keys(PRODUCT_TYPE_LABELS) as ProductType[])
      .filter((t) => acc[t])
      .map((t) => ({ type: t, ...acc[t] }))
  }, [orders])

  if (loading) return <LoadingSpinner text="Loading orders..." />

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">Orders 🧾</h1>
        <Button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          tone="success"
          className="min-h-[48px]"
          disabled={customers.length === 0}
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'New Order'}
        </Button>
      </div>

      {customers.length === 0 && (
        <Panel padding="md">
          <p className="text-text-secondary">
            Add a customer first before creating an order.{' '}
            <Link href="/dashboard/crm/customers" className="text-forest-600 underline">
              Go to Customers
            </Link>
          </p>
        </Panel>
      )}

      {showForm && customers.length > 0 && (
        <Panel padding="lg">
          <h3 className="text-xl font-semibold mb-4 text-foreground">New Order</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Customer *</FieldLabel>
                <SelectField
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="rounded-md"
                  required
                >
                  <option value="">Select a customer…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company ? `${c.name} (${c.company})` : c.name}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div>
                <FieldLabel>Order date</FieldLabel>
                <TextInput
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="rounded-md"
                />
              </div>
            </div>

            <OrderItemsEditor items={items} onChange={setItems} isUkNi={isUkNi} />

            <div>
              <FieldLabel>Notes</FieldLabel>
              <TextAreaField
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Delivery details, special requests, etc."
                className="rounded-md"
              />
            </div>

            <div className="flex gap-3 flex-wrap">
              <Button type="submit" tone="success" disabled={saving} className="min-h-[48px] px-6">
                Create Order
              </Button>
              <Button type="button" onClick={resetForm} tone="neutral" className="min-h-[48px] px-6">
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      )}

      {outstanding.count > 0 && (
        <Panel padding="md">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm text-text-secondary">Outstanding (unpaid orders)</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{formatMoney(outstanding.total, isUkNi)}</p>
            </div>
            <p className="text-sm text-text-tertiary">
              {outstanding.count} unpaid order{outstanding.count !== 1 ? 's' : ''}
              {outstanding.overdue > 0 && (
                <> · <span className="text-amber-600 dark:text-amber-400">{outstanding.overdue} over 30 days</span></>
              )}
            </p>
          </div>
        </Panel>
      )}

      {openSummary.length > 0 && (
        <Panel padding="md">
          <h3 className="font-semibold text-foreground mb-3">Open orders to fulfil</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {openSummary.map((s) => {
              const active = productFilter === s.type
              return (
                <button
                  key={s.type}
                  type="button"
                  onClick={() => {
                    setStatusFilter('pending')
                    setProductFilter(active ? 'all' : s.type)
                  }}
                  className={`text-left rounded-md border p-3 transition-colors ${
                    active ? 'border-forest-500 bg-forest-50 dark:bg-forest-900/20' : 'border-border hover:border-forest-400'
                  }`}
                >
                  <p className="text-sm text-text-secondary">{PRODUCT_TYPE_LABELS[s.type]}</p>
                  <p className="text-2xl font-bold text-foreground tabular-nums">{s.orders}</p>
                  <p className="text-xs text-text-tertiary">order{s.orders !== 1 ? 's' : ''} · {s.units} unit{s.units !== 1 ? 's' : ''}</p>
                </button>
              )
            })}
          </div>
        </Panel>
      )}

      {orders.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
            <TextInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order number or customer…"
              className="rounded-md pl-9"
            />
          </div>
          <SelectField
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="fj-control-inline rounded-md text-sm w-full sm:w-auto"
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="cancelled">Cancelled</option>
          </SelectField>
          <SelectField
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value as typeof productFilter)}
            className="fj-control-inline rounded-md text-sm w-full sm:w-auto"
          >
            <option value="all">All Products</option>
            {(Object.keys(PRODUCT_TYPE_LABELS) as ProductType[]).map((t) => (
              <option key={t} value={t}>{PRODUCT_TYPE_LABELS[t]}</option>
            ))}
          </SelectField>
          <p className="text-sm text-text-secondary">
            {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} · {formatMoney(filteredTotal, isUkNi)}
          </p>
        </div>
      )}

      {filteredOrders.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-tertiary border-b border-border">
                  <th className="py-2 pr-4 font-medium">Order</th>
                  <th className="py-2 px-4 font-medium">Customer</th>
                  <th className="py-2 px-4 font-medium">Date</th>
                  <th className="py-2 px-4 font-medium text-right">Total</th>
                  <th className="py-2 px-4 font-medium">Status</th>
                  <th className="py-2 px-4 font-medium">Payment</th>
                  <th className="py-2 pl-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => router.push(`/dashboard/crm/orders/${o.id}`)}
                    className="border-b border-border/60 hover:bg-surface-elevated/50 cursor-pointer"
                  >
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <Link
                        href={`/dashboard/crm/orders/${o.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-foreground hover:underline focus:underline focus:outline-none"
                      >
                        {o.order_number}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-text-secondary">{o.customer?.name || 'Unknown customer'}</td>
                    <td className="py-3 px-4 text-text-secondary whitespace-nowrap">{formatCrmDate(o.order_date)}</td>
                    <td className="py-3 px-4 text-right tabular-nums">{formatMoney(Number(o.total_amount), isUkNi)}</td>
                    <td className="py-3 px-4"><OrderStatusBadge status={o.status} /></td>
                    <td className="py-3 px-4"><PaymentStatusBadge status={o.payment_status} /></td>
                    <td className="py-3 pl-4">
                      <div className="flex gap-1 justify-end">
                        {o.status === 'pending' && (
                          <Button
                            onClick={(e) => { e.stopPropagation(); markFulfilled(o.id) }}
                            tone="success" size="sm" disabled={rowBusy === o.id} aria-label="Mark fulfilled"
                          >
                            <PackageCheck size={16} />
                          </Button>
                        )}
                        {o.payment_status === 'unpaid' && o.status !== 'cancelled' && (
                          <Button
                            onClick={(e) => { e.stopPropagation(); markPaid(o.id) }}
                            tone="blue" size="sm" disabled={rowBusy === o.id} aria-label="Mark paid"
                          >
                            <Banknote size={16} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filteredOrders.map((o) => (
              <Link key={o.id} href={`/dashboard/crm/orders/${o.id}`} className="block">
                <Panel padding="md" className="hover:border-forest-400 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {o.order_number} — {o.customer?.name || 'Unknown customer'}
                      </p>
                      <p className="text-sm text-text-tertiary">{formatCrmDate(o.order_date)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold text-foreground">{formatMoney(Number(o.total_amount), isUkNi)}</span>
                      <OrderStatusBadge status={o.status} />
                      <PaymentStatusBadge status={o.payment_status} />
                      <ChevronRight size={18} className="text-text-tertiary" />
                    </div>
                  </div>
                  {(o.status === 'pending' || (o.payment_status === 'unpaid' && o.status !== 'cancelled')) && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                      {o.status === 'pending' && (
                        <Button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); markFulfilled(o.id) }}
                          tone="success" size="sm" disabled={rowBusy === o.id}
                        >
                          <PackageCheck size={16} /> Fulfil
                        </Button>
                      )}
                      {o.payment_status === 'unpaid' && o.status !== 'cancelled' && (
                        <Button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); markPaid(o.id) }}
                          tone="blue" size="sm" disabled={rowBusy === o.id}
                        >
                          <Banknote size={16} /> Mark paid
                        </Button>
                      )}
                    </div>
                  )}
                </Panel>
              </Link>
            ))}
          </div>
        </>
      )}

      {orders.length > 0 && filteredOrders.length === 0 && (
        <p className="text-center text-text-tertiary py-8">No orders match your search or filters.</p>
      )}

      {orders.length === 0 && customers.length > 0 && !showForm && (
        <EmptyState
          icon={ShoppingCart}
          title="No Orders Yet"
          description="Create your first order to track sales and recognise revenue when paid."
          actionLabel="New Order"
          actionOnClick={() => setShowForm(true)}
        />
      )}
    </div>
  )
}
