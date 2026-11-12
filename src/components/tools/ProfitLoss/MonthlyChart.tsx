'use client'

import { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import Panel from '@/components/ui/Panel'
import { formatMoney } from '@/lib/crm-currency'
import { isDarkMode, themeChartOptions } from '@/lib/chart-theme'
import type { FinancialRecord } from '@/types/records'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

// Colours checked with the dataviz palette validator (12/11/2026). The lighter
// green-500/red-500 used on the cards fail for colour-blind readers (ΔE 3.5), so
// the chart uses darker steps: light green-700/red-600 (ΔE 8.6), dark
// green-600/red-700 on #111827 (ΔE 11.0).
const COLOURS = {
  light: { income: '#15803d', expense: '#dc2626' },
  dark: { income: '#16a34a', expense: '#b91c1c' },
}

interface MonthlyChartProps {
  /** Records already filtered by the P&L time filter. */
  records: FinancialRecord[]
  /** 'year': January to December of this year, by month. 'all': one pair per year. */
  period: 'year' | 'all'
  isUkNi: boolean
}

interface Bucket {
  label: string
  income: number
  expense: number
}

// Buckets by the YYYY-MM-DD string itself, so no time zone can move a record
// into the wrong month.
function buildBuckets(records: FinancialRecord[], period: 'year' | 'all'): Bucket[] {
  const add = (b: Bucket | undefined, r: FinancialRecord) => {
    if (!b) return
    const amount = Number(r.amount) || 0
    if (r.record_type === 'income') b.income += amount
    else b.expense += amount
  }

  if (period === 'year') {
    const year = new Date().getFullYear()
    const monthName = new Intl.DateTimeFormat('en-GB', { month: 'short' })
    const buckets = Array.from({ length: 12 }, (_, m) => ({
      label: monthName.format(new Date(year, m, 1)),
      income: 0,
      expense: 0,
    }))
    for (const r of records) {
      if (r.transaction_date.slice(0, 4) !== String(year)) continue
      add(buckets[Number(r.transaction_date.slice(5, 7)) - 1], r)
    }
    return buckets
  }

  // Only years that have records: a mistyped year (0226 for 2026) must not
  // create a bar for every year in between.
  const byYear = new Map<string, Bucket>()
  for (const r of records) {
    const year = r.transaction_date.slice(0, 4)
    if (!byYear.has(year)) byYear.set(year, { label: year, income: 0, expense: 0 })
    add(byYear.get(year), r)
  }
  return [...byYear.values()].sort((a, b) => a.label.localeCompare(b.label))
}

export default function MonthlyChart({ records, period, isUkNi }: MonthlyChartProps) {
  const isDark = isDarkMode()
  const buckets = useMemo(() => buildBuckets(records, period), [records, period])

  const options = useMemo(() => {
    const wholeMoney = new Intl.NumberFormat(isUkNi ? 'en-GB' : 'en-IE', {
      style: 'currency',
      currency: isUkNi ? 'GBP' : 'EUR',
      maximumFractionDigits: 0,
    })
    const base: ChartOptions<'bar'> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 14, boxHeight: 14 } },
        tooltip: {
          // 14px floor for the app's readers (Chart.js defaults to 12px here).
          titleFont: { size: 14 },
          bodyFont: { size: 14 },
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${formatMoney(Number(ctx.parsed.y) || 0, isUkNi)}`,
          },
        },
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { callback: (v) => wholeMoney.format(Number(v)) } },
      },
    }
    return themeChartOptions(base, isDark)
  }, [isUkNi, isDark])

  const data = useMemo(() => {
    const colours = isDark ? COLOURS.dark : COLOURS.light
    const bar = { borderRadius: 4, borderSkipped: 'bottom' as const, barPercentage: 0.9, categoryPercentage: 0.75 }
    return {
      labels: buckets.map((b) => b.label),
      datasets: [
        { label: 'Income', data: buckets.map((b) => b.income), backgroundColor: colours.income, ...bar },
        { label: 'Expenses', data: buckets.map((b) => b.expense), backgroundColor: colours.expense, ...bar },
      ],
    }
  }, [buckets, isDark])

  if (buckets.length === 0) return null

  const title = period === 'year' ? 'Income and expenses by month' : 'Income and expenses by year'
  const totalIncome = buckets.reduce((s, b) => s + b.income, 0)
  const totalExpense = buckets.reduce((s, b) => s + b.expense, 0)
  const summary = `${title}: income ${formatMoney(totalIncome, isUkNi)}, expenses ${formatMoney(totalExpense, isUkNi)}. The figures are in the table that follows.`

  return (
    <Panel padding="md">
      <h3 className="font-semibold text-foreground mb-2">{title}</h3>
      <div className="relative h-60 lg:h-72">
        <Bar data={data} options={options} role="img" aria-label={summary} />
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{period === 'year' ? 'Month' : 'Year'}</th>
            <th scope="col">Income</th>
            <th scope="col">Expenses</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.label}>
              <th scope="row">{b.label}</th>
              <td>{formatMoney(b.income, isUkNi)}</td>
              <td>{formatMoney(b.expense, isUkNi)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}
