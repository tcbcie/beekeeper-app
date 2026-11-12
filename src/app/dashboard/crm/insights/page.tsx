'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { BarChart3, ChevronRight } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import Panel from '@/components/ui/Panel'
import { useToast } from '@/components/ui/Toast'
import { formatMoney } from '@/lib/crm-currency'
import { orderBalance } from '@/lib/crm-orders'
import { firstOf } from '@/lib/embed'
import CategoryBreakdown from '@/components/ui/CategoryBreakdown'

interface InsightOrder {
  status: string
  total_amount: number
  amount_paid: number
}

// One income row from the Profit & Loss ledger (financial_records). Paid orders
// post their income here too, tagged with crm_order_id, so the ledger is the
// single source for every sales figure on this page.
interface IncomeRow {
  amount: number
  transaction_date: string
  crm_order_id: string | null
  category: { value: string } | { value: string }[] | null
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
  const [income, setIncome] = useState<IncomeRow[]>([])
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  const [isUkNi, setIsUkNi] = useState(false)
  const [loading, setLoading] = useState(true)
  // A failed load must not show €0 or "No sales yet" as if it were true.
  const [loadFailed, setLoadFailed] = useState(false)

  const fetchData = useCallback(async (uid: string) => {
    const year = new Date().getFullYear()
    const [ordersRes, incomeRes, custRes, profileRes] = await Promise.all([
      supabase
        .from('crm_orders')
        .select('status, total_amount, amount_paid')
        .eq('user_id', uid),
      supabase
        .from('financial_records')
        .select('amount, transaction_date, crm_order_id, category:dropdown_values(value)')
        .eq('user_id', uid)
        .eq('record_type', 'income')
        .gte('transaction_date', `${year}-01-01`)
        .lt('transaction_date', `${year + 1}-01-01`),
      supabase
        .from('crm_customer_summary')
        .select('id, name, orders_total, order_count')
        .eq('user_id', uid)
        .order('orders_total', { ascending: false })
        .limit(5),
      supabase.from('profiles').select('is_uk_ni_resident').eq('id', uid).maybeSingle(),
    ])

    if (ordersRes.error || incomeRes.error) {
      toast.error('Failed to load sales insights')
      setLoadFailed(true)
    }
    setOrders((ordersRes.data || []) as InsightOrder[])
    setIncome((incomeRes.data || []) as IncomeRow[])
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

  // Income comes from the Profit & Loss ledger (this year's rows): jar sales,
  // income added by hand, and fully-paid orders (posted with crm_order_id, dated
  // by paid_date). Outstanding and pending are order-only, so they still read orders.
  const stats = useMemo(() => {
    const now = new Date()
    const monthKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
    let incomeYear = 0, incomeMonth = 0, ordersYear = 0, ordersMonth = 0
    let outstanding = 0, pendingCount = 0

    for (const r of income) {
      const amount = Number(r.amount) || 0
      const fromOrder = r.crm_order_id != null
      const inMonth = r.transaction_date.slice(0, 7) === monthKey
      incomeYear += amount
      if (fromOrder) ordersYear += amount
      if (inMonth) {
        incomeMonth += amount
        if (fromOrder) ordersMonth += amount
      }
    }

    for (const o of orders) {
      if (o.status === 'cancelled') continue
      outstanding += orderBalance(o)
      if (o.status === 'pending') pendingCount += 1
    }

    const categories = income.map((r) => ({
      name: firstOf(r.category)?.value || 'Other Income',
      amount: Number(r.amount) || 0,
    }))

    return { incomeYear, incomeMonth, ordersYear, ordersMonth, outstanding, pendingCount, categories }
  }, [orders, income])

  if (loading) return <LoadingSpinner text="Loading sales insights..." />

  const year = new Date().getFullYear()
  // "€X from orders" and "€Y other" under each income figure, so a sale recorded
  // twice (an order and a jar sale) is easy to spot.
  const split = (total: number, fromOrders: number) => (
    <>
      <p className="text-sm text-text-tertiary tabular-nums">{formatMoney(fromOrders, isUkNi)} from orders</p>
      <p className="text-sm text-text-tertiary tabular-nums">{formatMoney(total - fromOrders, isUkNi)} other</p>
    </>
  )

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Sales Insights</h1>

      {loadFailed ? (
        <EmptyState
          icon={BarChart3}
          title="Sales insights did not load"
          description="Check your connection, then open this page again."
        />
      ) : orders.length === 0 && income.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No sales yet this year"
          description="Orders you mark paid, jar sales and income you add in Profit & Loss will appear here."
        />
      ) : (
        <>
          {/* Headline stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Panel padding="md">
              <p className="text-sm text-text-secondary">Income in {year}</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{formatMoney(stats.incomeYear, isUkNi)}</p>
              {stats.incomeYear > 0 && (
                split(stats.incomeYear, stats.ordersYear)
              )}
            </Panel>
            <Panel padding="md">
              <p className="text-sm text-text-secondary">Income this month</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{formatMoney(stats.incomeMonth, isUkNi)}</p>
              {stats.incomeMonth > 0 && (
                split(stats.incomeMonth, stats.ordersMonth)
              )}
            </Panel>
            <Panel padding="md">
              <p className="text-sm text-text-secondary">Outstanding</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{formatMoney(stats.outstanding, isUkNi)}</p>
            </Panel>
            <Panel padding="md">
              <p className="text-sm text-text-secondary">Open to fulfil</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{stats.pendingCount}</p>
              <p className="text-sm text-text-tertiary">pending order{stats.pendingCount !== 1 ? 's' : ''}</p>
            </Panel>
          </div>

          {/* Income by category */}
          <CategoryBreakdown
            title={`Income by category (${year})`}
            caption="All income"
            items={stats.categories}
            isUkNi={isUkNi}
            emptyText="No income recorded yet this year."
          />

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
                      <p className="text-sm text-text-tertiary">{c.order_count} order{c.order_count !== 1 ? 's' : ''}</p>
                    </div>
                    <span className="font-semibold text-foreground tabular-nums">{formatMoney(c.orders_total, isUkNi)}</span>
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          <Link
            href="/dashboard/tools?section=profitloss"
            className="flex items-center justify-between gap-3 min-h-12 px-4 py-3 rounded-lg border border-border bg-surface font-medium text-foreground hover:bg-surface-elevated/50"
          >
            <span>See costs and profit in Profit &amp; Loss</span>
            <ChevronRight size={20} className="text-text-tertiary flex-shrink-0" aria-hidden="true" />
          </Link>

          <p className="text-sm text-text-tertiary">
            Income comes from your Profit &amp; Loss records: jar sales, income you add yourself, and orders once
            they are fully paid. Deposits on part-paid orders show under Outstanding until the balance clears.
          </p>
        </>
      )}
    </div>
  )
}
