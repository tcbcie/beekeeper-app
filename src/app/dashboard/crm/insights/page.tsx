'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
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
import SelectField from '@/components/ui/SelectField'
import { Skeleton } from '@/components/ui/Skeleton'

// chart.js loads only when the chart is shown; the placeholder matches the
// chart panel's height so nothing jumps.
const MonthlyIncomeChart = dynamic(() => import('@/components/crm/MonthlyIncomeChart'), {
  ssr: false,
  loading: () => <Skeleton className="h-[19rem] lg:h-[22rem] rounded-lg" />,
})

interface InsightOrder {
  status: string
  total_amount: number
  amount_paid: number
  order_date: string
  customer_id: string | null
  customer: { name: string } | { name: string }[] | null
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
// Year read from a YYYY-MM-DD string, so no time zone moves a record.
const yearOf = (date: string) => Number(date.slice(0, 4))

export default function SalesInsightsPage() {
  const router = useRouter()
  const toast = useToast()
  const [orders, setOrders] = useState<InsightOrder[]>([])
  const [income, setIncome] = useState<IncomeRow[]>([])
  const [isUkNi, setIsUkNi] = useState(false)
  const [loading, setLoading] = useState(true)
  // A failed load must not show €0 or "No sales yet" as if it were true.
  const [loadFailed, setLoadFailed] = useState(false)
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear())
  // Year to compare the chart and income card with (null = none). Never the year
  // on show, so picking that year just switches the comparison off.
  const [compareYear, setCompareYear] = useState<number | null>(null)
  const activeCompareYear = compareYear !== selectedYear ? compareYear : null

  const fetchData = useCallback(async (uid: string) => {
    // All income rows (as Profit & Loss loads them); the chosen year is picked on the page.
    const [ordersRes, incomeRes, profileRes] = await Promise.all([
      supabase
        .from('crm_orders')
        .select('status, total_amount, amount_paid, order_date, customer_id, customer:crm_customers(name)')
        .eq('user_id', uid),
      supabase
        .from('financial_records')
        .select('amount, transaction_date, crm_order_id, category:dropdown_values(value)')
        .eq('user_id', uid)
        .eq('record_type', 'income'),
      supabase.from('profiles').select('is_uk_ni_resident').eq('id', uid).maybeSingle(),
    ])

    if (ordersRes.error || incomeRes.error) {
      toast.error('Failed to load sales insights')
      setLoadFailed(true)
    }
    setOrders((ordersRes.data || []) as InsightOrder[])
    setIncome((incomeRes.data || []) as IncomeRow[])
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

  // Years to choose from: the current year, the year on show and every year with
  // income or orders, newest first.
  const yearOptions = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear(), selectedYear])
    for (const r of income) years.add(yearOf(r.transaction_date))
    for (const o of orders) if (o.order_date) years.add(yearOf(o.order_date))
    return [...years].filter(Number.isInteger).sort((a, b) => b - a)
  }, [income, orders, selectedYear])

  // Income comes from the Profit & Loss ledger (the chosen year's rows): jar sales,
  // income added by hand, and fully-paid orders (posted with crm_order_id, dated
  // by paid_date). Outstanding and pending are today's position across all live
  // orders, so they do not follow the year.
  const stats = useMemo(() => {
    const now = new Date()
    const monthKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
    let incomeYear = 0, incomeMonth = 0, ordersYear = 0, ordersMonth = 0
    let outstanding = 0, pendingCount = 0
    const yearIncome = income.filter((r) => yearOf(r.transaction_date) === selectedYear)

    for (const r of yearIncome) {
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

    // Top customers for the year: non-cancelled orders dated in it, paid or not,
    // the same rule as crm_customer_summary but for one year.
    const byCustomer = new Map<string, TopCustomer>()
    for (const o of orders) {
      if (o.status === 'cancelled') continue
      outstanding += orderBalance(o)
      if (o.status === 'pending') pendingCount += 1
      if (!o.customer_id || !o.order_date || yearOf(o.order_date) !== selectedYear) continue
      const c = byCustomer.get(o.customer_id)
        ?? { id: o.customer_id, name: firstOf(o.customer)?.name || 'Customer', orders_total: 0, order_count: 0 }
      c.orders_total += Number(o.total_amount) || 0
      c.order_count += 1
      byCustomer.set(o.customer_id, c)
    }
    const topCustomers = [...byCustomer.values()]
      .filter((c) => c.orders_total > 0)
      .sort((a, b) => b.orders_total - a.orders_total)
      .slice(0, 5)

    const categories = yearIncome.map((r) => ({
      name: firstOf(r.category)?.value || 'Other Income',
      amount: Number(r.amount) || 0,
    }))

    return { incomeYear, incomeMonth, ordersYear, ordersMonth, outstanding, pendingCount, categories, topCustomers, yearIncome }
  }, [orders, income, selectedYear])

  // The comparison year's income rows and total (empty when there is no comparison).
  const compareIncome = useMemo(
    () => (activeCompareYear == null ? [] : income.filter((r) => yearOf(r.transaction_date) === activeCompareYear)),
    [income, activeCompareYear],
  )
  const compareTotal = useMemo(
    () => compareIncome.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [compareIncome],
  )

  if (loading) return <LoadingSpinner text="Loading sales insights..." />

  const year = selectedYear
  const isCurrentYear = selectedYear === new Date().getFullYear()
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
          title="No sales yet"
          description="Orders you mark paid, jar sales and income you add in Profit & Loss will appear here."
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="w-40">
              <SelectField
                label="Year"
                value={String(selectedYear)}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </SelectField>
            </div>
            <div className="w-40">
              <SelectField
                label="Compare with"
                value={activeCompareYear == null ? '' : String(activeCompareYear)}
                onChange={(e) => setCompareYear(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">None</option>
                {yearOptions.filter((y) => y !== selectedYear).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </SelectField>
            </div>
          </div>

          {/* Headline stats */}
          <div className={`grid grid-cols-2 gap-3 ${isCurrentYear ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
            <Panel padding="md">
              <p className="text-sm text-text-secondary">Income in {year}</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{formatMoney(stats.incomeYear, isUkNi)}</p>
              {stats.incomeYear > 0 && (
                split(stats.incomeYear, stats.ordersYear)
              )}
              {activeCompareYear != null && (
                <p className="text-sm text-text-secondary tabular-nums mt-1">{activeCompareYear}: {formatMoney(compareTotal, isUkNi)}</p>
              )}
            </Panel>
            {/* A month card only makes sense for the current year. */}
            {isCurrentYear && (
              <Panel padding="md">
                <p className="text-sm text-text-secondary">Income this month</p>
                <p className="text-2xl font-bold text-foreground tabular-nums">{formatMoney(stats.incomeMonth, isUkNi)}</p>
                {stats.incomeMonth > 0 && (
                  split(stats.incomeMonth, stats.ordersMonth)
                )}
              </Panel>
            )}
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

          {/* Income by month, stacked from orders / other (hidden when the year has none) */}
          {stats.incomeYear > 0 && (
            <MonthlyIncomeChart
              rows={stats.yearIncome}
              year={year}
              compareYear={activeCompareYear}
              compareRows={compareIncome}
              isUkNi={isUkNi}
            />
          )}

          {/* Income by category */}
          <CategoryBreakdown
            title={`Income by category (${year})`}
            caption="All income"
            items={stats.categories}
            isUkNi={isUkNi}
            emptyText={`No income recorded in ${year}.`}
          />

          {/* Top customers */}
          <Panel padding="md">
            <h3 className="font-semibold text-foreground mb-3">Top customers ({year})</h3>
            {stats.topCustomers.length === 0 ? (
              <p className="text-sm text-text-tertiary">No orders in {year}.</p>
            ) : (
              <div className="divide-y divide-border">
                {stats.topCustomers.map((c) => (
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
            Outstanding and open orders are as of today.
          </p>
        </>
      )}
    </div>
  )
}
