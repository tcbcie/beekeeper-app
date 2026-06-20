'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { ArrowLeft, Mail, Phone, MapPin } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Panel from '@/components/ui/Panel'
import { useToast } from '@/components/ui/Toast'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/crm/OrderBadges'
import { formatMoney } from '@/lib/crm-currency'
import { formatCrmDate } from '@/lib/crm-format'
import { isPartiallyPaid, summariseCustomerOrders } from '@/lib/crm-orders'
import type { Customer, Order } from '@/types/crm'

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [isUkNi, setIsUkNi] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (uid: string) => {
    const [customerRes, ordersRes, profileRes] = await Promise.all([
      supabase.from('crm_customers').select('*').eq('id', id).eq('user_id', uid).maybeSingle(),
      supabase.from('crm_orders').select('*').eq('customer_id', id).eq('user_id', uid).order('order_date', { ascending: false }),
      supabase.from('profiles').select('is_uk_ni_resident').eq('id', uid).maybeSingle(),
    ])

    if (customerRes.error || !customerRes.data) {
      toast.error(customerRes.error ? 'Failed to load customer' : 'Customer not found')
      router.push('/dashboard/crm/customers')
      return
    }
    if (ordersRes.error) toast.error('Failed to load order history')

    setCustomer(customerRes.data as Customer)
    setOrders((ordersRes.data || []) as Order[])
    setIsUkNi(profileRes.data?.is_uk_ni_resident || false)
    setLoading(false)
  }, [id, router, toast])

  useEffect(() => {
    const init = async () => {
      const uid = await getCurrentUserId()
      if (!uid) { router.push('/login'); return }
      load(uid)
    }
    init()
  }, [router, load])

  const stats = useMemo(() => summariseCustomerOrders(orders), [orders])

  if (loading || !customer) return <LoadingSpinner text="Loading customer..." />

  const addressParts = [
    customer.address_line1, customer.address_line2, customer.city,
    customer.county, customer.postcode, customer.country,
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <Link href="/dashboard/crm/customers" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-foreground">
        <ArrowLeft size={16} /> Back to Customers
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-foreground">{customer.name}</h1>
        {customer.company && <p className="text-text-secondary">{customer.company}</p>}
      </div>

      {/* Contact */}
      {(customer.email || customer.phone || addressParts.length > 0) && (
        <Panel padding="md">
          <h3 className="font-semibold text-foreground mb-2">Contact</h3>
          <div className="text-sm text-text-secondary space-y-1">
            {customer.email && (
              <p className="flex items-center gap-2"><Mail size={14} className="text-text-tertiary" /> {customer.email}</p>
            )}
            {customer.phone && (
              <p className="flex items-center gap-2"><Phone size={14} className="text-text-tertiary" /> {customer.phone}</p>
            )}
            {addressParts.length > 0 && (
              <p className="flex items-start gap-2"><MapPin size={14} className="text-text-tertiary mt-0.5" /> {addressParts.join(', ')}</p>
            )}
          </div>
        </Panel>
      )}

      {customer.notes && (
        <Panel padding="md">
          <h3 className="font-semibold text-foreground mb-2">Notes</h3>
          <p className="text-sm text-text-secondary whitespace-pre-wrap">{customer.notes}</p>
        </Panel>
      )}

      {/* Lifetime stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Panel padding="md">
          <p className="text-sm text-text-secondary">Orders</p>
          <p className="text-2xl font-bold text-foreground tabular-nums">{stats.count}</p>
        </Panel>
        <Panel padding="md">
          <p className="text-sm text-text-secondary">Lifetime total</p>
          <p className="text-2xl font-bold text-foreground tabular-nums">{formatMoney(stats.lifetime, isUkNi)}</p>
        </Panel>
        <Panel padding="md">
          <p className="text-sm text-text-secondary">Outstanding</p>
          <p className="text-2xl font-bold text-foreground tabular-nums">{formatMoney(stats.outstanding, isUkNi)}</p>
        </Panel>
      </div>

      {/* Order history */}
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-3">Order history</h3>

        {orders.length === 0 ? (
          <p className="text-text-tertiary py-4">No orders for this customer yet.</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-tertiary border-b border-border">
                    <th className="py-2 pr-4 font-medium">Order</th>
                    <th className="py-2 px-4 font-medium">Date</th>
                    <th className="py-2 px-4 font-medium text-right">Total</th>
                    <th className="py-2 px-4 font-medium">Status</th>
                    <th className="py-2 pl-4 font-medium">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
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
                      <td className="py-3 px-4 text-text-secondary whitespace-nowrap">{formatCrmDate(o.order_date)}</td>
                      <td className="py-3 px-4 text-right tabular-nums">{formatMoney(Number(o.total_amount), isUkNi)}</td>
                      <td className="py-3 px-4"><OrderStatusBadge status={o.status} /></td>
                      <td className="py-3 pl-4"><PaymentStatusBadge status={o.payment_status} partial={isPartiallyPaid(o)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {orders.map((o) => (
                <Link key={o.id} href={`/dashboard/crm/orders/${o.id}`} className="block">
                  <Panel padding="md" className="hover:border-forest-400 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{o.order_number}</p>
                        <p className="text-sm text-text-tertiary">{formatCrmDate(o.order_date)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold text-foreground">{formatMoney(Number(o.total_amount), isUkNi)}</span>
                        <OrderStatusBadge status={o.status} />
                        <PaymentStatusBadge status={o.payment_status} partial={isPartiallyPaid(o)} />
                      </div>
                    </div>
                  </Panel>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
