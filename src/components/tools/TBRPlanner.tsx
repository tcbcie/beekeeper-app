'use client'
import { useMemo, useState } from 'react'
import { Scissors, CalendarClock, Info, ChevronDown, ChevronUp, Sparkles, AlertTriangle, Wheat, Bug } from 'lucide-react'
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend as ChartLegend,
  Filler,
  TimeScale,
  type ChartOptions,
  type Plugin,
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import { Line } from 'react-chartjs-2'
import Button from '@/components/ui/Button'
import { useTbrPlanner } from '@/hooks/useTbrPlanner'
import { addDays, dayDiff, parseISODate, steadyStateForagers, peakAdultPopulation, totalAdultLifespanDays, CELLS_PER_DADANT_DEEP } from '@/lib/tbr-model'
import type { CropDateTier, TbrConstants, InterventionMethod } from '@/types/tbr'

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, ChartLegend, Filler, TimeScale)

// Draws shaded crop/flow bands and dashed marker lines OVER the forager curve, so
// the translucent area fill underneath doesn't wash them out.
const bandsPlugin: Plugin<'line'> = {
  id: 'tbrBands',
  afterDatasetsDraw(chart, _args, opts) {
    const o = opts as {
      bands?: { start: string; end: string; color: string }[]
      lines?: { date: string; color: string }[]
    }
    const x = chart.scales.x
    const area = chart.chartArea
    if (!x || !area) return
    const ctx = chart.ctx
    for (const b of o.bands ?? []) {
      const x1 = x.getPixelForValue(parseISODate(b.start).getTime())
      const x2 = x.getPixelForValue(parseISODate(b.end).getTime())
      ctx.save()
      ctx.fillStyle = b.color
      ctx.fillRect(x1, area.top, x2 - x1, area.bottom - area.top)
      ctx.restore()
    }
    for (const l of o.lines ?? []) {
      const px = x.getPixelForValue(parseISODate(l.date).getTime())
      ctx.save()
      ctx.strokeStyle = l.color
      ctx.lineWidth = 2
      ctx.setLineDash([5, 4])
      ctx.beginPath()
      ctx.moveTo(px, area.top)
      ctx.lineTo(px, area.bottom)
      ctx.stroke()
      ctx.restore()
    }
  },
}

const TIER_BADGE: Record<CropDateTier, { label: string; cls: string }> = {
  observed: { label: 'Observed', cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  projected: { label: 'Projected', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  estimated: { label: 'Estimated', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  unknown: { label: 'No data', cls: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return parseISODate(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

type ConstantField = { key: keyof TbrConstants; label: string; min: number; max: number; step: number }

const SHARED_FIELDS: ConstantField[] = [
  { key: 'eggToEmergenceDays', label: 'Egg → emergence (days)', min: 16, max: 24, step: 1 },
  { key: 'emergenceToForagerDays', label: 'Emergence → forager (days)', min: 14, max: 28, step: 1 },
  { key: 'foragingCareerDays', label: 'Foraging career (days)', min: 5, max: 21, step: 1 },
]
const TBR_FIELDS: ConstantField[] = [
  { key: 'reLayDelayDays', label: 'Comb-draw / re-lay delay (days)', min: 0, max: 14, step: 1 },
]
const CAGING_FIELDS: ConstantField[] = [
  { key: 'cageDurationDays', label: 'Cage duration (days)', min: 18, max: 28, step: 1 },
  { key: 'cageReleaseRelayDays', label: 'Re-lay delay after release (days)', min: 0, max: 7, step: 1 },
]

function constantFields(method: InterventionMethod): ConstantField[] {
  return method === 'caging' ? [...CAGING_FIELDS, ...SHARED_FIELDS] : [...TBR_FIELDS, ...SHARED_FIELDS]
}

export default function TBRPlanner({ userId }: { userId: string }) {
  const planner = useTbrPlanner(userId)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const {
    apiaries, selectedApiaryId, setSelectedApiaryId,
    vegOptions, springVegId, summerVegId, setSpringVegId, setSummerVegId,
    resolvedSpring, resolvedSummer, constants, setConstants,
    method, setMethod,
    precocious, setPrecocious,
    tbrOverride, setTbrOverride, result, foodPlan, loading, error, noProjection,
  } = planner

  const isCaging = method === 'caging'
  const breakDateLabel = isCaging ? 'caging date' : 'TBR date'

  const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark')

  const effectiveTbr = result?.effectiveTbrDate ?? null
  const steady = steadyStateForagers(constants) || 1
  const peakPop = peakAdultPopulation(constants) || 1

  // Two stacked charts share one date axis, bands and marker lines; only the series differs.
  const charts = useMemo(() => {
    if (!result) return null
    const { plan, bounds } = result
    const bands = [
      bounds.springEnd
        ? { start: addDays(bounds.springEnd, -30), end: bounds.springEnd, color: isDark ? 'rgba(34,197,94,0.22)' : 'rgba(34,197,94,0.28)' }
        : null,
      { start: bounds.flowStart, end: bounds.flowEnd, color: isDark ? 'rgba(59,130,246,0.22)' : 'rgba(59,130,246,0.26)' },
    ].filter(Boolean) as { start: string; end: string; color: string }[]
    const lines = [
      { date: plan.milestones.tbrDate, color: isDark ? '#f87171' : '#dc2626' },
      { date: plan.milestones.firstForagerDate, color: isDark ? '#facc15' : '#b45309' },
    ]

    const mkOptions = (yTitle: string): ChartOptions<'line'> => {
      const options: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          // The app registers chartjs-plugin-datalabels globally; disable it here so
          // raw point coordinates aren't drawn over the curve.
          datalabels: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => {
                const x = items[0]?.parsed.x
                return typeof x === 'number' ? formatDate(new Date(x).toISOString().slice(0, 10)) : ''
              },
              label: (item) => `${item.dataset.label}: ${item.parsed.y}%`,
            },
          },
        },
        scales: {
          x: {
            type: 'time',
            time: { unit: 'week', displayFormats: { week: 'd MMM' } },
            ticks: { color: isDark ? '#9ca3af' : '#374151', maxRotation: 0 },
            grid: { color: isDark ? '#374151' : '#e5e7eb' },
          },
          y: {
            beginAtZero: true,
            max: 110,
            title: { display: true, text: yTitle, color: isDark ? '#9ca3af' : '#374151' },
            ticks: { color: isDark ? '#9ca3af' : '#374151' },
            grid: { color: isDark ? '#374151' : '#e5e7eb' },
          },
        },
      }
      // Custom plugin options are keyed by plugin id; attach via a typed cast.
      ;(options.plugins as Record<string, unknown>).tbrBands = { bands, lines }
      return options
    }

    const foragerData = {
      datasets: [
        {
          label: 'Forager strength',
          data: plan.curve.map((p) => ({ x: parseISODate(p.date).getTime(), y: Math.round((p.foragers / steady) * 100) })),
          borderColor: isDark ? '#facc15' : '#b45309',
          backgroundColor: isDark ? 'rgba(250,204,21,0.12)' : 'rgba(180,83,9,0.10)',
          fill: true, tension: 0.25, pointRadius: 0, borderWidth: 2,
        },
      ],
    }
    const populationData = {
      datasets: [
        {
          label: 'Colony population',
          data: plan.curve.map((p) => ({ x: parseISODate(p.date).getTime(), y: Math.round((p.population / peakPop) * 100) })),
          borderColor: isDark ? '#34d399' : '#047857',
          backgroundColor: isDark ? 'rgba(52,211,153,0.12)' : 'rgba(4,120,87,0.10)',
          fill: true, tension: 0.25, pointRadius: 0, borderWidth: 2,
        },
      ],
    }

    return {
      forager: { data: foragerData, options: mkOptions('Forager strength (%)') },
      population: { data: populationData, options: mkOptions('Colony population (%)') },
    }
  }, [result, isDark, steady, peakPop])

  // TBR-date slider bounds.
  const slider = useMemo(() => {
    if (!result) return null
    const { earliest, latest } = result.bounds
    const span = Math.max(1, dayDiff(earliest, latest))
    const value = Math.min(span, Math.max(0, effectiveTbr ? dayDiff(earliest, effectiveTbr) : 0))
    return { earliest, span, value }
  }, [result, effectiveTbr])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-forest-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Scissors size={24} className="text-forest-600 dark:text-forest-400" />
          Swarm &amp; Varroa Brood-Break Planner
        </h3>
        <p className="text-sm text-text-secondary mt-2">
          A brood break does two jobs: it <strong>controls swarming</strong> and it leaves the colony
          <strong> broodless for an oxalic-acid varroa treatment</strong>. This planner works out when
          to do it so the forager force rebuilds to peak across your next nectar flow — bridging the
          gap after the early spring crop.
        </p>
      </div>

      {/* Method toggle */}
      <div>
        <span className="block text-sm font-medium text-foreground mb-2">Method</span>
        <SegmentedControl<InterventionMethod>
          ariaLabel="Intervention method"
          value={method}
          onChange={setMethod}
          options={[
            { value: 'tbr', label: 'Total Brood Removal' },
            { value: 'caging', label: 'Cage the Queen' },
          ]}
        />
        <p className="text-xs text-text-tertiary mt-1">
          {isCaging
            ? 'The caged queen can’t leave, so a swarm returns. After the cage period the colony is broodless and the comb and most brood are preserved.'
            : 'All brood is removed and replaced with foundation, so the colony restarts its brood nest — the strongest reset, but it must redraw comb.'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {apiaries.length === 0 ? (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-200">
          Add an apiary (with a location) and some GDD bloom records first — the planner uses your
          apiary&apos;s observed bloom dates and growing-degree-day curve.
        </div>
      ) : (
        <>
          {/* Apiary picker */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Apiary (location)</label>
            <select
              value={selectedApiaryId ?? ''}
              onChange={(e) => setSelectedApiaryId(e.target.value)}
              className="w-full px-4 py-3 text-base border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-forest-500"
            >
              {apiaries.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <p className="text-xs text-text-tertiary mt-1">
              Bloom timing varies 2–3 weeks across locations, so everything is calculated for this apiary.
            </p>
          </div>

          {/* Crop pickers */}
          <div className="grid md:grid-cols-2 gap-4">
            <CropPicker
              label="Early spring crop (harvested before TBR)"
              vegOptions={vegOptions}
              value={springVegId}
              onChange={setSpringVegId}
              resolvedDate={resolvedSpring?.date ?? null}
              tier={resolvedSpring?.tier}
              note={resolvedSpring?.note}
            />
            <CropPicker
              label="Summer flow (the target to peak for)"
              vegOptions={vegOptions}
              value={summerVegId}
              onChange={setSummerVegId}
              resolvedDate={resolvedSummer?.date ?? null}
              tier={resolvedSummer?.tier}
              note={resolvedSummer?.note}
            />
          </div>

          {noProjection && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-200">
              This apiary has no coordinates and no bloom records yet, so crop dates can&apos;t be
              estimated. Add a location to the apiary or record a bloom date in the GDD Tracker.
            </div>
          )}

          {!result ? (
            <div className="bg-surface-secondary rounded-lg p-4 text-sm text-text-secondary">
              Choose a summer flow crop the model can date to see the plan.
            </div>
          ) : (
            <>
              {/* Recommendation */}
              <div className="bg-forest-50 dark:bg-forest-900/20 border border-forest-200 dark:border-forest-800 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <Sparkles size={22} className="text-forest-600 dark:text-forest-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-text-secondary">Recommended {breakDateLabel}</p>
                    <p className="text-3xl font-bold text-forest-700 dark:text-forest-300">
                      {formatDate(result.plan.recommendedTbrDate)}
                    </p>
                    <p className="text-sm text-text-secondary mt-2">
                      Forager strength sustained across the {resolvedSummer?.name} flow:{' '}
                      <span className="font-semibold text-foreground">
                        {Math.round(result.plan.flowCoverageScore * 100)}%
                      </span>{' '}
                      of full strength at the chosen date.
                    </p>
                    <p className="text-sm text-text-secondary mt-1">
                      Full strength ≈ <span className="font-semibold text-foreground">{steadyStateForagers(constants).toLocaleString()}</span> foragers
                      within ≈ <span className="font-semibold text-foreground">{peakAdultPopulation(constants).toLocaleString()}</span> adult bees
                      (adult life {totalAdultLifespanDays(constants)} d = {constants.emergenceToForagerDays} d house-bee + {constants.foragingCareerDays} d foraging).
                    </p>
                    {result.plan.recommendedTbrDate && tbrOverride && tbrOverride !== result.plan.recommendedTbrDate && (
                      <Button
                        onClick={() => setTbrOverride(null)}
                        className="mt-3 px-3 py-1.5 text-sm rounded-lg bg-forest-600 text-white hover:bg-forest-700"
                      >
                        Use recommended date
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Late-break warning (false-win guard) */}
              {result.plan.recoveryAfterFlowStart && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle size={22} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 text-sm text-amber-900 dark:text-amber-200">
                    <p className="font-semibold">Late break — read this score with care</p>
                    <p className="mt-1">
                      New foragers won&apos;t arrive until{' '}
                      <span className="font-semibold">{formatDate(result.plan.milestones.firstForagerDate)}</span>, after the{' '}
                      {resolvedSummer?.name ?? 'summer'} flow starts ({formatDate(result.bounds.flowStart)}). The early flow
                      rides your existing foragers, but strength then collapses through the mid-to-late flow and the colony
                      heads into autumn weakened — so a high coverage figure here can be misleading.
                    </p>
                    {result.plan.recommendedTbrDate && result.effectiveTbrDate !== result.plan.recommendedTbrDate && (
                      <Button
                        onClick={() => setTbrOverride(null)}
                        className="mt-3 px-3 py-1.5 text-sm rounded-lg bg-amber-600 text-white hover:bg-amber-700"
                      >
                        Use recommended date ({formatDate(result.plan.recommendedTbrDate)})
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Varroa treatment window (broodless) */}
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 flex items-start gap-3">
                <Bug size={22} className="text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 text-sm text-purple-900 dark:text-purple-200">
                  <p className="font-semibold">Varroa treatment window (broodless)</p>
                  <p className="mt-1">
                    The colony has no capped brood between{' '}
                    <span className="font-semibold">{formatDate(result.plan.milestones.broodlessStartDate)}</span> and{' '}
                    <span className="font-semibold">{formatDate(result.plan.milestones.broodlessEndDate)}</span> — apply a
                    single oxalic-acid treatment in this window to hit mites while none are hidden under cappings.
                  </p>
                </div>
              </div>

              {/* Stacked charts: forager strength + overall colony population */}
              {charts && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">Forager strength</p>
                    <div className="h-64 relative">
                      <Line data={charts.forager.data} options={charts.forager.options} plugins={[bandsPlugin]} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">Overall colony population</p>
                    <div className="h-64 relative">
                      <Line data={charts.population.data} options={charts.population.options} plugins={[bandsPlugin]} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-text-tertiary">
                    <Legend swatch="bg-amber-600" label="Forager strength" />
                    <Legend swatch="bg-emerald-600" label="Colony population" />
                    <Legend swatch="bg-green-500/40" label="Spring crop" />
                    <Legend swatch="bg-blue-500/40" label="Summer flow" />
                    <Legend swatch="bg-red-600" label={isCaging ? 'Caging date' : 'TBR date'} dashed />
                    <Legend swatch="bg-amber-600" label="First new foragers" dashed />
                  </div>
                </div>
              )}

              {/* Cage-duration preset (caging only) */}
              {isCaging && (
                <div>
                  <span className="block text-sm font-medium text-foreground mb-2">Cage long enough to clear</span>
                  <SegmentedControl<number>
                    size="sm"
                    ariaLabel="Cage duration"
                    value={constants.cageDurationDays}
                    onChange={(days) => setConstants({ ...constants, cageDurationDays: days })}
                    options={[
                      { value: 21, label: 'Worker brood — 21 d' },
                      { value: 24, label: '+ Drone brood — 24 d' },
                    ]}
                  />
                  <p className="text-xs text-text-tertiary mt-1">
                    24 days also clears capped drone brood (a varroa reservoir); fine-tune in Advanced.
                  </p>
                </div>
              )}

              {/* Break-date slider */}
              {slider && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <CalendarClock size={16} className="inline mr-1 -mt-0.5" />
                    Adjust {breakDateLabel} — <span className="font-semibold">{formatDate(effectiveTbr)}</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={slider.span}
                    step={1}
                    value={slider.value}
                    onChange={(e) => setTbrOverride(addDays(slider.earliest, Number(e.target.value)))}
                    className="w-full h-3 accent-forest-600 cursor-pointer"
                    aria-label="TBR date"
                  />
                  <div className="flex justify-between text-xs text-text-tertiary mt-1">
                    <span>{formatDate(result.bounds.earliest)}</span>
                    <span>{formatDate(result.bounds.latest)}</span>
                  </div>
                </div>
              )}

              {/* Lay-rate slider */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Queen lay rate — <span className="font-semibold">{constants.layRate}</span> eggs/day
                </label>
                <input
                  type="range"
                  min={1000}
                  max={2500}
                  step={50}
                  value={constants.layRate}
                  onChange={(e) => setConstants({ ...constants, layRate: Number(e.target.value) })}
                  className="w-full h-3 accent-forest-600 cursor-pointer"
                  aria-label="Queen lay rate"
                />
                <p className="text-xs text-text-tertiary mt-1">
                  ≈ {(constants.layRate * constants.eggToEmergenceDays).toLocaleString()} cells of brood at peak
                  (~{(constants.layRate * constants.eggToEmergenceDays / CELLS_PER_DADANT_DEEP).toFixed(1)} Dadant deep frames).
                  The chart shows % of full strength, so the recommended timing is independent of lay rate.
                </p>
              </div>

              {/* Precocious-foraging toggle */}
              <label className="flex items-start gap-3 p-3 rounded-lg border border-border cursor-pointer">
                <input
                  type="checkbox"
                  checked={precocious}
                  onChange={(e) => setPrecocious(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-forest-600 flex-shrink-0"
                />
                <span className="text-sm">
                  <span className="font-medium text-foreground">Model precocious foraging (faster recovery)</span>
                  <span className="block text-text-tertiary mt-0.5">
                    A forager-depleted colony raises foragers ~7 days younger than usual after a break, so it
                    recovers sooner. Off by default — the conservative estimate assumes normal timing.
                  </span>
                </span>
              </label>

              {/* Milestones */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {isCaging ? (
                  <>
                    <Milestone label="Queen caged" date={result.plan.milestones.tbrDate} />
                    <Milestone label="Queen released" date={result.plan.milestones.releaseDate} />
                    <Milestone label="First new brood" date={result.plan.milestones.firstBroodDate} />
                    <Milestone label="First new foragers" date={result.plan.milestones.firstForagerDate} highlight />
                  </>
                ) : (
                  <>
                    <Milestone label="TBR performed" date={result.plan.milestones.tbrDate} />
                    <Milestone label="Queen re-lays" date={result.plan.milestones.reLayDate} />
                    <Milestone label="First brood emerges" date={result.plan.milestones.firstBroodDate} />
                    <Milestone label="First new foragers" date={result.plan.milestones.firstForagerDate} highlight />
                  </>
                )}
              </div>

              {/* Rebuild food budget & starvation risk */}
              {foodPlan && (
                <div className="bg-surface-secondary border border-border rounded-lg p-4">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                    <Wheat size={18} className="text-forest-600 dark:text-forest-400" />
                    Rebuild food budget
                    <span className="text-xs font-normal text-text-tertiary">
                      ({isCaging ? 'comb retained — no foundation to draw' : `${foodPlan.budget.framesToDraw} frames of foundation to draw`})
                    </span>
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm">
                        <span className="font-semibold text-foreground">≈ {foodPlan.budget.totalHoneyKg.toFixed(1)} kg honey</span>{' '}
                        — funded from stores
                      </p>
                      <ul className="text-xs text-text-secondary mt-1 space-y-0.5">
                        {!isCaging && <li>Comb drawing: {foodPlan.budget.combHoneyKg.toFixed(1)} kg</li>}
                        <li>Brood food: {foodPlan.budget.broodHoneyKg.toFixed(1)} kg</li>
                        <li>Upkeep + warmth: {foodPlan.budget.upkeepHoneyKg.toFixed(1)} kg</li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm">
                        <span className="font-semibold text-foreground">≈ {foodPlan.budget.pollenKg.toFixed(1)} kg pollen</span>{' '}
                        — mostly foraged
                      </p>
                      <p className="text-xs text-text-secondary mt-1">
                        ~{foodPlan.budget.pollenToForageKg.toFixed(1)} kg must come from fresh foraging — stored beebread covers
                        only ~{foodPlan.budget.storedBeebreadKg} kg, so the rebuild needs steady pollen flights (a cold, wet spell
                        stalls it regardless of honey).
                      </p>
                    </div>
                  </div>

                  {foodPlan.incomeBeforeRecovery ? (
                    <div className="mt-3 text-sm bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-green-800 dark:text-green-200">
                      A nectar source ({foodPlan.nextNectarName}) is predicted ~{formatDate(foodPlan.nextNectarDate)} — before your
                      foragers recover — so income resumes part-way through the rebuild and eases the cost.
                    </div>
                  ) : (
                    <div className="mt-3 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-800 dark:text-red-200">
                      <span className="font-semibold">Starvation risk:</span> no worthwhile nectar flow is predicted during the rebuild
                      {foodPlan.nextNectarName ? ` (next is ${foodPlan.nextNectarName} ~${formatDate(foodPlan.nextNectarDate)})` : ''}.
                      Leave or feed ≈ {foodPlan.budget.totalHoneyKg.toFixed(1)} kg of stores and don&apos;t strip the spring crop bare.
                    </div>
                  )}
                  <p className="text-xs text-text-tertiary mt-2">
                    {isCaging
                      ? 'Caging keeps the nest and most of the brood, so the rebuild is far cheaper than TBR — no comb to redraw. Scales with lay rate; honey comes from stores, pollen mostly from foraging.'
                      : 'Assumes comb is drawn from foundation (worst case). Scales with lay rate; honey comes from stores, pollen mostly from foraging.'}
                  </p>
                </div>
              )}

              {/* Advanced constants */}
              <div className="border border-border rounded-lg">
                <Button
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground"
                >
                  Advanced: biological constants
                  {showAdvanced ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </Button>
                {showAdvanced && (
                  <div className="px-4 pb-4 grid sm:grid-cols-2 gap-4">
                    {constantFields(method).map((f) => (
                      <div key={f.key}>
                        <label className="block text-xs font-medium text-text-secondary mb-1">{f.label}</label>
                        <input
                          type="number"
                          value={constants[f.key]}
                          min={f.min}
                          max={f.max}
                          step={f.step}
                          onChange={(e) => {
                            const n = Number(e.target.value)
                            if (Number.isFinite(n)) {
                              setConstants({ ...constants, [f.key]: Math.min(f.max, Math.max(f.min, n)) })
                            }
                          }}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-forest-500"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Explanation */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-200">
                <p className="flex items-center gap-2 font-semibold mb-1">
                  <Info size={16} /> How to read this
                </p>
                <p>
                  {isCaging
                    ? 'While the queen is caged the existing brood keeps emerging for about three weeks, so the population holds up through the swarm season before dipping — then recovers once she re-lays. The population curve leads the forager curve, since today’s emerging bees are tomorrow’s foragers.'
                    : 'After TBR the standing foragers keep working but aren’t replaced for several weeks, so the curve dips before recovering. Already-emerged house bees bridge the early part of that gap.'}
                  {' '}The recommended date is as soon as the spring crop is off, giving the colony the
                  most time to rebuild before the summer flow.
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function CropPicker({
  label, vegOptions, value, onChange, resolvedDate, tier, note,
}: {
  label: string
  vegOptions: { id: string; name: string; hasRecords: boolean }[]
  value: string | null
  onChange: (id: string) => void
  resolvedDate: string | null
  tier?: CropDateTier
  note?: string
}) {
  const badge = tier ? TIER_BADGE[tier] : null
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 text-base border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-forest-500"
      >
        <option value="" disabled>Select a crop…</option>
        {vegOptions.map((v) => (
          <option key={v.id} value={v.id}>{v.hasRecords ? `★ ${v.name}` : v.name}</option>
        ))}
      </select>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-sm font-semibold text-foreground">{formatDate(resolvedDate)}</span>
        {badge && <span className={`text-xs px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>}
      </div>
      {note && <p className="text-xs text-text-tertiary mt-1">{note}</p>}
    </div>
  )
}

function SegmentedControl<T extends string | number>({
  options, value, onChange, ariaLabel, size = 'lg',
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  ariaLabel: string
  size?: 'lg' | 'sm'
}) {
  const pad = size === 'lg' ? 'px-4 py-3 text-base' : 'px-4 py-2.5 text-sm'
  return (
    <div className="inline-flex rounded-lg border border-border overflow-hidden" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`${pad} font-medium transition-colors ${
            value === o.value ? 'bg-forest-600 text-white' : 'bg-surface text-foreground hover:bg-surface-secondary'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Milestone({ label, date, highlight }: { label: string; date: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 border ${highlight ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-surface-secondary border-border'}`}>
      <p className="text-xs text-text-tertiary">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? 'text-amber-700 dark:text-amber-300' : 'text-foreground'}`}>
        {formatDate(date)}
      </p>
    </div>
  )
}

function Legend({ swatch, label, dashed }: { swatch: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-4 ${dashed ? 'h-0 border-t-2 border-dashed' : 'h-2.5 rounded-sm'} ${swatch} ${dashed ? swatch.replace('bg-', 'border-') : ''}`} />
      {label}
    </span>
  )
}
