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

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

// Colours checked with the dataviz palette validator (12/11/2026): green and
// blue pass every check in both modes (colour-blind ΔE about 27). The surface
// colour draws the 2px gap between the two stacked parts.
const COLOURS = {
  light: { orders: '#15803d', other: '#2563eb', surface: '#ffffff' },
  dark: { orders: '#16a34a', other: '#3b82f6', surface: '#111827' },
}

export interface MonthlyIncomeRow {
  amount: number
  transaction_date: string
  crm_order_id: string | null
}

interface MonthlyIncomeChartProps {
  /** Income rows of the chosen year only. */
  rows: MonthlyIncomeRow[]
  year: number
  isUkNi: boolean
}

/**
 * Sales Insights: income by month for one year, stacked "From orders" (bottom)
 * and "Other" (jar sales and income added by hand, on top).
 */
export default function MonthlyIncomeChart({ rows, year, isUkNi }: MonthlyIncomeChartProps) {
  const isDark = isDarkMode()

  // Buckets by the month in the YYYY-MM-DD string, so no time zone moves a row.
  const months = useMemo(() => {
    const monthName = new Intl.DateTimeFormat('en-GB', { month: 'short' })
    const buckets = Array.from({ length: 12 }, (_, m) => ({
      label: monthName.format(new Date(year, m, 1)),
      orders: 0,
      other: 0,
    }))
    for (const r of rows) {
      const b = buckets[Number(r.transaction_date.slice(5, 7)) - 1]
      if (!b) continue
      const amount = Number(r.amount) || 0
      if (r.crm_order_id != null) b.orders += amount
      else b.other += amount
    }
    return buckets
  }, [rows, year])

  const options = useMemo(() => {
    const wholeMoney = new Intl.NumberFormat(isUkNi ? 'en-GB' : 'en-IE', {
      style: 'currency',
      currency: isUkNi ? 'GBP' : 'EUR',
      maximumFractionDigits: 0,
    })
    const base: ChartOptions<'bar'> = {
      responsive: true,
      maintainAspectRatio: false,
      // A tap anywhere in a month shows both parts and the total.
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 14, boxHeight: 14 } },
        tooltip: {
          // 14px floor for the app's readers (Chart.js defaults to 12px here).
          titleFont: { size: 14 },
          bodyFont: { size: 14 },
          footerFont: { size: 14 },
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${formatMoney(Number(ctx.parsed.y) || 0, isUkNi)}`,
            footer: (items) => `Total: ${formatMoney(items.reduce((s, i) => s + (Number(i.parsed.y) || 0), 0), isUkNi)}`,
          },
        },
      },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, beginAtZero: true, ticks: { callback: (v) => wholeMoney.format(Number(v)) } },
      },
    }
    return themeChartOptions(base, isDark)
  }, [isUkNi, isDark])

  const data = useMemo(() => {
    const c = isDark ? COLOURS.dark : COLOURS.light
    return {
      labels: months.map((m) => m.label),
      datasets: [
        {
          // Bottom part. A 2px top border in the surface colour leaves the gap
          // between the two parts (borders are drawn inside the bar).
          label: 'From orders',
          data: months.map((m) => m.orders),
          backgroundColor: c.orders,
          borderColor: c.surface,
          borderWidth: { top: 2, left: 0, right: 0, bottom: 0 },
          borderSkipped: 'bottom' as const,
          barPercentage: 0.8,
        },
        {
          label: 'Other',
          data: months.map((m) => m.other),
          backgroundColor: c.other,
          borderRadius: 4,
          borderSkipped: 'bottom' as const,
          barPercentage: 0.8,
        },
      ],
    }
  }, [months, isDark])

  const total = months.reduce((s, m) => s + m.orders + m.other, 0)
  if (total <= 0) return null

  const title = `Income by month (${year})`
  const summary = `${title}: total ${formatMoney(total, isUkNi)}, split into income from orders and other income. The figures are in the table that follows.`

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
            <th scope="col">Month</th>
            <th scope="col">From orders</th>
            <th scope="col">Other</th>
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => (
            <tr key={m.label}>
              <th scope="row">{m.label}</th>
              <td>{formatMoney(m.orders, isUkNi)}</td>
              <td>{formatMoney(m.other, isUkNi)}</td>
              <td>{formatMoney(m.orders + m.other, isUkNi)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}
