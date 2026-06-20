'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { BarChart3 } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import Panel from '@/components/ui/Panel'
import { useToast } from '@/components/ui/Toast'
import { formatMoney } from '@/lib/crm-currency'
import { orderBalance } from '@/lib/crm-orders'
import { PRODUCT_TYPE_LABELS, type ProductType } from '@/types/crm'

interface InsightOrder {
  order_date: string
  paid_date: string | null
  status: string
  payment_status: string
  total_amount: number
  amount_paid: number
  items: { product_type: ProductType; quantity: number; unit_price: number }[]
}

interface TopCustomer {
  id: string
  name: string
  orders_total: number
  order_count: number
}

const pad = (n: number) => String(n).padStart(2, '0')

export default function SalesInsightsPage() {
  const router = useRouter()
  const toast = useToast()
  const [orders, setOrders] = useState<InsightOrder[]>([])
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  const [isUkNi, setIsUkNi] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async (uid: string) => {
    const [ordersRes, custRes, profileRes] = await Promise.all([
      supabase
        .from('crm_orders')
        .select('order_date, paid_date, status, payment_status, total_amount, amount_paid, items:crm_order_items(product_type, quantity, unit_price)')
        .eq('user_id', uid),
      supabase
        .from('crm_customer_summary')
        .select('id, name, orders_total, order_count')
        .eq('user_id', uid)
        .order('orders_total', { ascending: false })
        .limit(5),
      supabase.from('profiles').select('is_uk_ni_resident').eq('id', uid).maybeSingle(),
    ])

    if (ordersRes.error) toast.error('Failed to load sales insights')
    setOrders((ordersRes.data || []) as InsightOrder[])
    setTopCustomers(
      (custRes.data || [])
        .map((c) => ({
          id: c.id,
          name: c.name,
          orders_total: Number(c.orders_total) || 0,
          order_count: Number(c.order_count) || 0,
        }))
        .filter((c) => c.orders_total > 0),
    )
    setIsUkNi(profileRes.data?.is_uk_ni_resident || false)
    setLoading(false)
  }, [toast])

  useEffect(() => {
    const init = async () => {
      const id = await getCurrentUserId()
      if (!id) { router.push('/login'); return }
      fetchData(id)
    }
    init()
  }, [router, fetchData])

  // Cash-basis, mirroring the ledger: revenue counts only fully-paid orders,
  // dated by paid_date. Outstanding is the balance owed across live orders.
  const stats = useMemo(() => {
    const now = new Date()
    const yearStart = `${now.getFullYear()}-01-01`
    const monthStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`
    let paidYear = 0, paidMonth = 0, outstanding = 0, pendingCount = 0
    const byProduct = {} as Record<ProductType, number>

    for (const o of orders) {
      if (o.status === 'cancelled') continue
      outstanding += orderBalance(o)
      if (o.status === 'pending') pendingCount += 1
      if (o.payment_status === 'paid') {
        const total = Number(o.total_amount) || 0
        const date = o.paid_date || o.order_date
        if (date >= monthStart) paidMonth += total
        if (date >= yearStart) {
          paidYear += total
          for (const i of o.items || []) {
            byProduct[i.product_type] = (byProduct[i.product_type] || 0) + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0)
          }
        }
      }
    }

    const products = (Object.keys(PRODUCT_TYPE_LABELS) as ProductType[])
      .filter((t) => byProduct[t])
      .map((t) => ({ type: t, amount: byProduct[t] }))
      .sort((a, b) => b.amount - a.amount)
    const maxProduct = products.reduce((m, p) => Math.max(m, p.amount), 0)

    return { paidYear, paidMonth, outstanding, pendingCount, products, maxProduct }
  }, [orders])

  if (loading) return <LoadingSpinner text="Loading sales insights..." />

  const year = new Date().getFullYear()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Sales Insights 📊</h1>

      {orders.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No Sales Yet"
          description="Once you create orders and mark them paid, your sales overview will appear here."
        />
      ) : (
        <>
          {/* Headline stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Panel padding="md">
              <p className="text-sm text-text-secondary">Paid in {year}</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{formatMoney(stats.paidYear, isUkNi)}</p>
            </Panel>
            <Panel padding="md">
              <p className="text-sm text-text-secondary">Paid this month</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{formatMoney(stats.paidMonth, isUkNi)}</p>
            </Panel>
            <Panel padding="md">
              <p className="text-sm text-text-secondary">Outstanding</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{formatMoney(stats.outstanding, isUkNi)}</p>
            </Panel>
            <Panel padding="md">
              <p className="text-sm text-text-secondary">Open to fulfil</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{stats.pendingCount}</p>
              <p className="text-xs text-text-tertiary">pending order{stats.pendingCount !== 1 ? 's' : ''}</p>
            </Panel>
          </div>

          {/* Sales by product */}
          <Panel padding="md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Sales by product ({year})</h3>
              <span className="text-sm text-text-tertiary">Paid orders</span>
            </div>
            {stats.products.length === 0 ? (
              <p className="text-sm text-text-tertiary">No paid sales yet this year.</p>
            ) : (
              <div className="space-y-2">
                {stats.products.map((p) => (
                  <div key={p.type}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-text-secondary">{PRODUCT_TYPE_LABELS[p.type]}</span>
                      <span className="font-medium text-foreground tabular-nums">{formatMoney(p.amount, isUkNi)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-elevated overflow-hidden">
                      <div
                        className="h-full rounded-full bg-forest-500"
                        style={{ width: `${stats.maxProduct > 0 ? Math.max(4, (p.amount / stats.maxProduct) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Top customers */}
          <Panel padding="md">
            <h3 className="font-semibold text-foreground mb-3">Top customers</h3>
            {topCustomers.length === 0 ? (
              <p className="text-sm text-text-tertiary">No customer sales recorded yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {topCustomers.map((c) => (
                  <Link
                    key={c.id}
                    href={`/dashboard/crm/customers/${c.id}`}
                    className="flex items-center justify-between py-2 hover:bg-surface-elevated/50 -mx-2 px-2 rounded-md"
                  >
                    <div>
                      <p className="font-medium text-foreground">{c.name}</p>
                      <p className="text-xs text-text-tertiary">{c.order_count} order{c.order_count !== 1 ? 's' : ''}</p>
                    </div>
                    <span className="font-semibold text-foreground tabular-nums">{formatMoney(c.orders_total, isUkNi)}</span>
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          <p className="text-xs text-text-tertiary">
            Revenue figures count fully-paid orders only (cash basis), matching your income ledger. Deposits on
            part-paid orders are shown under Outstanding until the balance clears.
          </p>
        </>
      )}
    </div>
  )
}
