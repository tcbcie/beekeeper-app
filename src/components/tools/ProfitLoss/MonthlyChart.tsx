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
import { chartColours, isDarkMode, themeChartOptions } from '@/lib/chart-theme'
import type { FinancialRecord } from '@/types/records'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend)

// Colours checked as a set with the dataviz palette validator (--pairs all,
// 12/11/2026). The lighter green-500/red-500 used on the cards fail for
// colour-blind readers (ΔE 3.5), so the chart uses darker steps. Net is blue,
// like the Net Profit card. Dark expense red is #c62828: red-700 (#b91c1c) was
// under 3:1 contrast on #111827. Its colour-blind ΔE 7.8 against the green is in
// the allowed band because income is always the left bar and the legend shows.
// The comparison year's net line is a neutral grey reference mark (dashed, with
// hollow points), not a new category: at least 4.5:1 on both surfaces.
const COLOURS = {
  light: { income: '#15803d', expense: '#dc2626', net: '#2563eb', compare: '#6b7280', surface: '#ffffff' },
  dark: { income: '#16a34a', expense: '#c62828', net: '#3b82f6', compare: '#9ca3af', surface: '#111827' },
}

interface MonthlyChartProps {
  /** Records already filtered by the P&L time filter. */
  records: FinancialRecord[]
  /** 'year': January to December of `year`, by month. 'all': one pair per year. */
  period: 'year' | 'all'
  /** The year shown when period is 'year'. */
  year: number
  /** Year view only: another year whose monthly net profit is drawn as a dashed line. */
  compareYear?: number | null
  /** That year's records. */
  compareRecords?: FinancialRecord[]
  isUkNi: boolean
}

interface Bucket {
  label: string
  income: number
  expense: number
  /** A month still to come: no net point, so the line stops at today. */
  future?: boolean
}

// Buckets by the YYYY-MM-DD string itself, so no time zone can move a record
// into the wrong month.
function buildBuckets(records: FinancialRecord[], period: 'year' | 'all', year: number): Bucket[] {
  const add = (b: Bucket | undefined, r: FinancialRecord) => {
    if (!b) return
    const amount = Number(r.amount) || 0
    if (r.record_type === 'income') b.income += amount
    else b.expense += amount
  }

  if (period === 'year') {
    const now = new Date()
    const nowYear = now.getFullYear()
    const monthName = new Intl.DateTimeFormat('en-GB', { month: 'short' })
    const buckets: Bucket[] = Array.from({ length: 12 }, (_, m) => ({
      label: monthName.format(new Date(year, m, 1)),
      income: 0,
      expense: 0,
      future: year > nowYear || (year === nowYear && m > now.getMonth()),
    }))
    for (const r of records) {
      if (Number(r.transaction_date.slice(0, 4)) !== year) continue
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

export default function MonthlyChart({ records, period, year, compareYear = null, compareRecords, isUkNi }: MonthlyChartProps) {
  const isDark = isDarkMode()
  const buckets = useMemo(() => buildBuckets(records, period, year), [records, period, year])
  // Month buckets of the comparison year (Year view only).
  const compareBuckets = useMemo(
    () => (period === 'year' && compareYear != null ? buildBuckets(compareRecords ?? [], 'year', compareYear) : null),
    [period, compareYear, compareRecords],
  )

  const options = useMemo(() => {
    const wholeMoney = new Intl.NumberFormat(isUkNi ? 'en-GB' : 'en-IE', {
      style: 'currency',
      currency: isUkNi ? 'GBP' : 'EUR',
      maximumFractionDigits: 0,
    })
    const { ink, grid } = chartColours(isDark)
    // Legend and tooltip in dataset order (Income, Expenses, Net profit, then the
    // comparison year), not drawing order: the lines are drawn on top of the bars.
    const byDataset = (a: { datasetIndex?: number }, b: { datasetIndex?: number }) => (a.datasetIndex ?? 0) - (b.datasetIndex ?? 0)
    const base: ChartOptions<'bar' | 'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      // A tap anywhere in a month shows every figure, no need to hit a thin bar.
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 14, boxHeight: 14, sort: byDataset } },
        tooltip: {
          // 14px floor for the app's readers (Chart.js defaults to 12px here).
          titleFont: { size: 14 },
          bodyFont: { size: 14 },
          itemSort: byDataset,
          filter: (item) => item.parsed.y != null,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${formatMoney(Number(ctx.parsed.y) || 0, isUkNi)}`,
          },
        },
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => wholeMoney.format(Number(v)) },
          // A clear zero line, so loss months read as below it.
          grid: {
            color: (ctx) => (ctx.tick?.value === 0 ? ink : grid),
            lineWidth: (ctx) => (ctx.tick?.value === 0 ? 2 : 1),
          },
        },
      },
    }
    return themeChartOptions(base, isDark)
  }, [isUkNi, isDark])

  const data = useMemo(() => {
    const colours = isDark ? COLOURS.dark : COLOURS.light
    const bar = { type: 'bar' as const, order: 1, borderRadius: 4, borderSkipped: 'bottom' as const, barPercentage: 0.9, categoryPercentage: 0.75 }
    const chartData: ChartData<'bar' | 'line', (number | null)[], string> = {
      labels: buckets.map((b) => b.label),
      datasets: [
        { label: 'Income', data: buckets.map((b) => b.income), backgroundColor: colours.income, ...bar },
        { label: 'Expenses', data: buckets.map((b) => b.expense), backgroundColor: colours.expense, ...bar },
        {
          type: 'line' as const,
          label: 'Net profit',
          data: buckets.map((b) => (b.future ? null : b.income - b.expense)),
          order: 0,
          borderColor: colours.net,
          backgroundColor: colours.net,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0,
        },
      ],
    }
    if (compareBuckets && compareYear != null) {
      chartData.datasets.push({
        type: 'line' as const,
        label: `Net profit ${compareYear}`,
        data: compareBuckets.map((b) => (b.future ? null : b.income - b.expense)),
        // Drawn under this year's blue line (lower order is drawn on top).
        order: 0.5,
        borderColor: colours.compare,
        backgroundColor: colours.surface,
        pointBorderColor: colours.compare,
        pointBackgroundColor: colours.surface,
        borderWidth: 2,
        borderDash: [4, 4],
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0,
      })
    }
    return chartData
  }, [buckets, compareBuckets, compareYear, isDark])

  if (buckets.length === 0) return null

  const title = period === 'year' ? `Income and expenses by month (${year})` : 'Income and expenses by year'
  const totalIncome = buckets.reduce((s, b) => s + b.income, 0)
  const totalExpense = buckets.reduce((s, b) => s + b.expense, 0)
  const compareNet = compareBuckets ? compareBuckets.reduce((s, b) => s + b.income - b.expense, 0) : 0
  const compareText = compareBuckets && compareYear != null
    ? ` Compared with net profit ${formatMoney(compareNet, isUkNi)} in ${compareYear}.`
    : ''
  const summary = `${title}: income ${formatMoney(totalIncome, isUkNi)}, expenses ${formatMoney(totalExpense, isUkNi)}, net profit ${formatMoney(totalIncome - totalExpense, isUkNi)}.${compareText} The figures are in the table that follows.`

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
            <th scope="col">{period === 'year' ? 'Month' : 'Year'}</th>
            <th scope="col">Income</th>
            <th scope="col">Expenses</th>
            <th scope="col">Net profit</th>
            {compareBuckets && <th scope="col">Net profit {compareYear}</th>}
          </tr>
        </thead>
        <tbody>
          {buckets.map((b, i) => {
            const c = compareBuckets?.[i]
            return (
              <tr key={b.label}>
                <th scope="row">{b.label}</th>
                <td>{formatMoney(b.income, isUkNi)}</td>
                <td>{formatMoney(b.expense, isUkNi)}</td>
                <td>{b.future ? 'Not yet' : formatMoney(b.income - b.expense, isUkNi)}</td>
                {c && <td>{c.future ? 'Not yet' : formatMoney(c.income - c.expense, isUkNi)}</td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </Panel>
  )
}
