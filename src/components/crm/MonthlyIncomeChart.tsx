'use client'

import { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { Chart } from 'react-chartjs-2'
import Panel from '@/components/ui/Panel'
import { formatMoney } from '@/lib/crm-currency'
import { isDarkMode, themeChartOptions } from '@/lib/chart-theme'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend)

// Colours checked with the dataviz palette validator (12/11/2026): green and
// blue pass every check in both modes (colour-blind ΔE about 27). The surface
// colour draws the 2px gap between the two stacked parts. The comparison year's
// line is a neutral grey reference mark (dashed, hollow points, at least 4.5:1),
// as on the P&L chart.
const COLOURS = {
  light: { orders: '#15803d', other: '#2563eb', compare: '#6b7280', surface: '#ffffff' },
  dark: { orders: '#16a34a', other: '#3b82f6', compare: '#9ca3af', surface: '#111827' },
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
  /** Another year whose monthly total income is drawn as a dashed line. */
  compareYear?: number | null
  /** That year's income rows. */
  compareRows?: MonthlyIncomeRow[]
  isUkNi: boolean
}

/**
 * Sales Insights: income by month for one year, stacked "From orders" (bottom)
 * and "Other" (jar sales and income added by hand, on top).
 */
// Buckets by the month in the YYYY-MM-DD string, so no time zone moves a row.
function monthBuckets(rows: MonthlyIncomeRow[], year: number) {
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
}

export default function MonthlyIncomeChart({ rows, year, compareYear = null, compareRows, isUkNi }: MonthlyIncomeChartProps) {
  const isDark = isDarkMode()

  const months = useMemo(() => monthBuckets(rows, year), [rows, year])
  // Monthly totals of the comparison year; months still to come are null so the
  // line stops at today when that year is the current one.
  const compareTotals = useMemo(() => {
    if (compareYear == null) return null
    const now = new Date()
    return monthBuckets(compareRows ?? [], compareYear).map((b, m) =>
      compareYear > now.getFullYear() || (compareYear === now.getFullYear() && m > now.getMonth())
        ? null
        : b.orders + b.other,
    )
  }, [compareRows, compareYear])

  const options = useMemo(() => {
    const wholeMoney = new Intl.NumberFormat(isUkNi ? 'en-GB' : 'en-IE', {
      style: 'currency',
      currency: isUkNi ? 'GBP' : 'EUR',
      maximumFractionDigits: 0,
    })
    // Legend and tooltip in dataset order (From orders, Other, then the comparison
    // year), not drawing order: the line has a lower order so it sits on top.
    const byDataset = (a: { datasetIndex?: number }, b: { datasetIndex?: number }) => (a.datasetIndex ?? 0) - (b.datasetIndex ?? 0)
    const base: ChartOptions<'bar' | 'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      // A tap anywhere in a month shows both parts, the total and any comparison.
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 14, boxHeight: 14, sort: byDataset } },
        tooltip: {
          // 14px floor for the app's readers (Chart.js defaults to 12px here).
          titleFont: { size: 14 },
          bodyFont: { size: 14 },
          footerFont: { size: 14 },
          itemSort: byDataset,
          filter: (item) => item.parsed.y != null,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${formatMoney(Number(ctx.parsed.y) || 0, isUkNi)}`,
            // Total of the two stacked parts only (the comparison line is not part of it).
            footer: (items) => `Total: ${formatMoney(
              items.filter((i) => i.dataset.type !== 'line').reduce((s, i) => s + (Number(i.parsed.y) || 0), 0),
              isUkNi,
            )}`,
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
    const chartData: ChartData<'bar' | 'line', (number | null)[], string> = {
      labels: months.map((m) => m.label),
      datasets: [
        {
          // Bottom part. A 2px top border in the surface colour leaves the gap
          // between the two parts (borders are drawn inside the bar).
          type: 'bar' as const,
          stack: 'income',
          label: 'From orders',
          data: months.map((m) => m.orders),
          backgroundColor: c.orders,
          borderColor: c.surface,
          borderWidth: { top: 2, left: 0, right: 0, bottom: 0 },
          borderSkipped: 'bottom' as const,
          barPercentage: 0.8,
        },
        {
          type: 'bar' as const,
          stack: 'income',
          label: 'Other',
          data: months.map((m) => m.other),
          backgroundColor: c.other,
          borderRadius: 4,
          borderSkipped: 'bottom' as const,
          barPercentage: 0.8,
        },
      ],
    }
    if (compareTotals && compareYear != null) {
      chartData.datasets.push({
        type: 'line' as const,
        // Its own stack, so it is never added on top of the stacked bars.
        stack: 'compare',
        label: `Income ${compareYear}`,
        data: compareTotals,
        order: -1,
        borderColor: c.compare,
        backgroundColor: c.surface,
        pointBorderColor: c.compare,
        pointBackgroundColor: c.surface,
        borderWidth: 2,
        borderDash: [4, 4],
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0,
      })
    }
    return chartData
  }, [months, compareTotals, compareYear, isDark])

  const total = months.reduce((s, m) => s + m.orders + m.other, 0)
  if (total <= 0) return null

  const title = `Income by month (${year})`
  const compareSum = compareTotals ? compareTotals.reduce<number>((s, v) => s + (v ?? 0), 0) : 0
  const compareText = compareTotals && compareYear != null
    ? ` Compared with ${formatMoney(compareSum, isUkNi)} in ${compareYear}.`
    : ''
  const summary = `${title}: total ${formatMoney(total, isUkNi)}, split into income from orders and other income.${compareText} The figures are in the table that follows.`

  return (
    <Panel padding="md">
      <h3 className="font-semibold text-foreground mb-2">{title}</h3>
      <div className="relative h-60 lg:h-72">
        <Chart type="bar" data={data} options={options} role="img" aria-label={summary} />
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">From orders</th>
            <th scope="col">Other</th>
            <th scope="col">Total</th>
            {compareTotals && <th scope="col">Income {compareYear}</th>}
          </tr>
        </thead>
        <tbody>
          {months.map((m, i) => (
            <tr key={m.label}>
              <th scope="row">{m.label}</th>
              <td>{formatMoney(m.orders, isUkNi)}</td>
              <td>{formatMoney(m.other, isUkNi)}</td>
              <td>{formatMoney(m.orders + m.other, isUkNi)}</td>
              {compareTotals && <td>{compareTotals[i] == null ? 'Not yet' : formatMoney(compareTotals[i] ?? 0, isUkNi)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}
