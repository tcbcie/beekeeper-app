import { differenceInCalendarDays, parseLocalDate } from '@/lib/date-utils'
import { formatDayMonth } from '@/lib/dashboard-todo'
import { formatWindow, isGoodDay, weekdayName } from '@/lib/inspection-weather'
import type { DayVerdict } from '@/lib/inspection-weather'
import { isGettingLight, isPossibleSwarm, SWARM_DROP_WINDOW_HOURS } from '@/lib/scale-alerts'
import { getSeason } from '@/lib/seasons'
import type { Season } from '@/lib/seasons'
import type { DashboardApiary, DashboardScaleSummary } from '@/types/dashboard'

/**
 * The dashboard's top card: one question for the season, answered from the user's own records
 * (agreed with the owner, 30 October 2026). Weather appears only in spring and swarm season, when
 * it decides what to do.
 */

/** Swarm season: an apiary is due its check 7 days after its last inspection */
const SWARM_CHECK_DAYS = 7
const MAX_SWARM_APIARY_ROWS = 3

export interface LeadRow {
  key: string
  title: string
  note: string
  pill: string
  tone: 'amber' | 'green'
  /** The step for this row alone; shown instead of the pill */
  action?: { label: string; href: string }
}

export interface SeasonalLead {
  season: Season
  band: string
  question: string
  answer: string
  rows: LeadRow[]
  showForecast: boolean
  action: { label: string; href: string } | null
}

export interface SeasonalLeadInput {
  /** Apiaries with hives, in the order to visit them */
  apiaries: DashboardApiary[]
  scales: DashboardScaleSummary[]
  scalesLoading: boolean
  forecast: { days: DayVerdict[] | null; failed: boolean }
  now?: Date
}

export const seasonShowsForecast = (season: Season) => season === 'spring' || season === 'swarm'

const NEW_FEED = '/dashboard/records?create=feeding'
const NEW_TREATMENT = '/dashboard/records?create=varroa_treatment'

const hiveName = (scale: DashboardScaleSummary) => scale.hiveNumber ?? 'A hive with a scale'
const signedKg = (kg: number) => `${kg > 0 ? '+' : ''}${kg.toFixed(1)} kg`
const hivesWord = (n: number) => (n === 1 ? 'hive' : 'hives')

function latestDate(dates: (string | null | undefined)[]): string | null {
  return dates.reduce<string | null>((latest, date) => (date && (!latest || date > latest) ? date : latest), null)
}

function lastFedNote(apiaries: DashboardApiary[]): string {
  const fed = formatDayMonth(latestDate(apiaries.map(a => a.lastFeedDate)))
  return fed ? `Last fed ${fed}` : 'No feed recorded'
}

function scalesByLightest(scales: DashboardScaleSummary[]): (DashboardScaleSummary & { change7d: number })[] {
  return scales
    .filter((s): s is DashboardScaleSummary & { change7d: number } => typeof s.change7d === 'number')
    .sort((a, b) => a.change7d - b.change7d)
}

/** Hives have scales but no figures arrived: say so rather than imply all is well */
function scaleReadingsMissing(input: SeasonalLeadInput, withFigures: unknown[]): boolean {
  return !input.scalesLoading && withFigures.length === 0 &&
    input.apiaries.some(a => Array.isArray(a.scales) && a.scales.length > 0)
}

function autumnLead(input: SeasonalLeadInput, now: Date): SeasonalLead {
  const { apiaries, scales, scalesLoading } = input
  const withFigures = scalesByLightest(scales)
  const light = withFigures.filter(s => isGettingLight(s.change7d))

  const fedNote = lastFedNote(apiaries)
  const storesNote = withFigures.length > 0
    ? `Scales this week: ${withFigures.map(s => `${hiveName(s)} ${signedKg(s.change7d)}`).join(', ')}. ${fedNote}`
    : fedNote

  // Treated this season means since 1 July: the harvest is off and the winter bees are still to come
  const sinceDate = `${now.getFullYear()}-07-01`
  const untreated = apiaries.filter(a => !a.lastTreatmentDate || a.lastTreatmentDate < sinceDate)
  const lastTreated = formatDayMonth(latestDate(apiaries.map(a => a.lastTreatmentDate)))

  const rows: LeadRow[] = [
    // The app cannot know a colony's stores in kg: only a real reading earns a green pill
    scalesLoading
      ? { key: 'stores', title: 'Stores', note: storesNote, pill: 'Checking', tone: 'amber' }
      : light.length > 0
        ? { key: 'stores', title: 'Stores', note: storesNote, pill: 'Check', tone: 'amber', action: { label: 'Record feed', href: NEW_FEED } }
        : withFigures.length > 0
          ? { key: 'stores', title: 'Stores', note: storesNote, pill: 'Steady', tone: 'green' }
          : { key: 'stores', title: 'Stores', note: `${storesNote}. About 18 kg is a rough guide`, pill: 'Heft', tone: 'amber' },
    untreated.length > 0
      ? { key: 'varroa', title: 'Varroa treatment', note: `None recorded since 1 July at ${untreated.map(a => a.name).join(', ')}`, pill: 'To do', tone: 'amber', action: { label: 'Record treatment', href: NEW_TREATMENT } }
      : { key: 'varroa', title: 'Varroa treatment', note: lastTreated ? `Last recorded ${lastTreated}` : 'None recorded', pill: 'Done', tone: 'green' },
  ]
  let answer: string
  if (scalesLoading) {
    answer = 'Checking your scales…'
  } else if (light.length > 0) {
    answer = light.length === 1
      ? `Stores first: ${hiveName(light[0])} is getting lighter`
      : `Stores first: ${light.length} hives are getting lighter`
  } else if (untreated.length > 0) {
    answer = 'No varroa treatment recorded since 1 July'
  } else if (scaleReadingsMissing(input, withFigures)) {
    answer = 'Scale readings are not available right now'
  } else if (withFigures.length === 0) {
    answer = 'Heft your hives to check their stores'
  } else {
    answer = 'On track for winter'
  }

  return { season: 'autumn', band: 'Getting ready for winter', question: 'Are they ready for winter?', answer, rows, showForecast: false, action: null }
}

function winterLead(input: SeasonalLeadInput): SeasonalLead {
  const { apiaries, scales, scalesLoading } = input
  const withFigures = scalesByLightest(scales)
  const light = withFigures.filter(s => isGettingLight(s.change7d))
  const steady = withFigures.filter(s => !isGettingLight(s.change7d))

  const rows: LeadRow[] = light.map(s => ({
    key: `light:${s.hiveId}`,
    title: hiveName(s),
    note: `${signedKg(s.change7d)} in 7 days, heft to check stores`,
    pill: 'Check',
    tone: 'amber',
    action: { label: 'Record feed', href: `/dashboard/records?hive=${s.hiveId}&type=feeding` },
  }))
  if (steady.length > 0) {
    rows.push({ key: 'steady', title: steady.map(hiveName).join(', '), note: 'Under 2 kg lost this week', pill: 'Steady', tone: 'green' })
  }
  const hiveTotal = apiaries.reduce((sum, a) => sum + a.hiveCount, 0)
  const scaleHives = new Set(apiaries.flatMap(a => (Array.isArray(a.scales) ? a.scales : []).map(s => s.hiveId))).size
  const withoutScale = Math.max(hiveTotal - scaleHives, 0)
  if (withoutScale > 0) {
    rows.push({
      key: 'noscale',
      title: `${withoutScale} ${hivesWord(withoutScale)} without a scale`,
      note: `${lastFedNote(apiaries)}, heft on your next visit`,
      pill: 'Heft',
      tone: 'amber',
    })
  }

  const answer = scalesLoading
    ? 'Checking your scales…'
    : light.length > 0
      ? `${light.length} ${hivesWord(light.length)} ${light.length === 1 ? 'needs' : 'need'} a look`
      : scaleReadingsMissing(input, withFigures)
        ? 'Scale readings are not available right now'
        : 'Nothing needs doing'

  return {
    season: 'winter',
    band: 'Winter: nothing to do',
    question: 'Do they have enough food?',
    answer,
    rows,
    showForecast: false,
    action: null,
  }
}

function springLead(input: SeasonalLeadInput, now: Date): SeasonalLead {
  const { apiaries, forecast } = input
  const yearStart = `${now.getFullYear()}-01-01`
  const looked = apiaries.filter(a => a.lastInspectionDate && a.lastInspectionDate >= yearStart)
  const notYet = apiaries.filter(a => !a.lastInspectionDate || a.lastInspectionDate < yearStart)

  const rows: LeadRow[] = []
  if (looked.length > 0) {
    const latest = formatDayMonth(latestDate(looked.map(a => a.lastInspectionDate)))
    rows.push({ key: 'done', title: looked.map(a => a.name).join(', '), note: latest ? `First look done, latest ${latest}` : 'First look done', pill: 'Done', tone: 'green' })
  }
  if (notYet.length > 0) {
    rows.push({ key: 'notyet', title: notYet.map(a => a.name).join(', '), note: 'No inspection yet this year', pill: 'To do', tone: 'amber' })
  }

  let answer: string
  if (notYet.length === 0) {
    answer = 'Every apiary has had its first look'
  } else if (forecast.failed) {
    answer = 'The forecast is not available right now'
  } else if (!forecast.days) {
    answer = 'Checking the forecast…'
  } else {
    const [today, ...later] = forecast.days
    const next = later.find(isGoodDay)
    answer = today && isGoodDay(today)
      ? `Today looks good for a first look, ${formatWindow(today.window!)}`
      : next
        ? `${weekdayName(next.date, 'long')} looks good for a first look, ${formatWindow(next.window!)}`
        : 'No good day for a first look in the next five days'
  }

  return {
    season: 'spring',
    band: 'First look of the year',
    question: 'Have they come through winter?',
    answer,
    rows,
    showForecast: true,
    action: notYet.length > 0 ? { label: 'Start an inspection', href: '/dashboard/records?create=inspection' } : null,
  }
}

function swarmLead(input: SeasonalLeadInput, now: Date): SeasonalLead {
  const { apiaries, scales, scalesLoading } = input
  const swarms = scales.filter(s => isPossibleSwarm(s.largestDrop3h))

  const rows: LeadRow[] = swarms.map(s => {
    const drop = s.largestDrop3h!
    const when = new Date(drop.at)
    const part = when.getHours() < 12 ? 'morning' : when.getHours() < 17 ? 'afternoon' : 'evening'
    return {
      key: `swarm:${s.hiveId}`,
      title: s.hiveNumber ? `Hive ${s.hiveNumber}` : hiveName(s),
      note: `Lost ${drop.kg.toFixed(1)} kg within ${SWARM_DROP_WINDOW_HOURS} hours, ${when.toLocaleDateString('en-IE', { weekday: 'long' })} ${part}`,
      pill: 'Look',
      tone: 'amber',
    }
  })

  // Queen cells are only seen by opening the hive, so this counts inspections, not any visit
  const byWait = apiaries
    .map(apiary => {
      const last = apiary.lastInspectionDate ? parseLocalDate(apiary.lastInspectionDate) : null
      const days = last ? Math.max(differenceInCalendarDays(last, now), 0) : null
      return { apiary, days, last }
    })
    .sort((a, b) => (b.days ?? Infinity) - (a.days ?? Infinity))

  const due = byWait.filter(w => w.days === null || w.days >= SWARM_CHECK_DAYS)
  for (const wait of byWait.slice(0, MAX_SWARM_APIARY_ROWS)) {
    const isDue = wait.days === null || wait.days >= SWARM_CHECK_DAYS
    let note: string
    if (wait.days === null) {
      note = 'No inspection recorded, due now'
    } else if (isDue) {
      note = `Last inspection ${wait.days} days ago, due now`
    } else {
      const nextDue = new Date(wait.last!)
      nextDue.setDate(nextDue.getDate() + SWARM_CHECK_DAYS)
      const ago = wait.days === 0 ? 'today' : `${wait.days} ${wait.days === 1 ? 'day' : 'days'} ago`
      note = `Last inspection ${ago}, due ${nextDue.toLocaleDateString('en-IE', { weekday: 'long' })}`
    }
    rows.push({ key: `apiary:${wait.apiary.id}`, title: wait.apiary.name, note, pill: isDue ? 'Due' : 'Soon', tone: isDue ? 'amber' : 'green' })
  }

  const parts: string[] = []
  if (swarms.length === 1) parts.push(`${hiveName(swarms[0])} may have swarmed`)
  else if (swarms.length > 1) parts.push(`${swarms.length} hives may have swarmed`)
  if (due.length === 1) parts.push(`${due[0].apiary.name} is due its check`)
  else if (due.length > 1) parts.push(`${due.length} apiaries are due their check`)

  const answer = parts.length > 0
    ? parts.join(', ')
    : scalesLoading ? 'Checking your scales…' : 'No apiary is due its check yet'

  let action: SeasonalLead['action'] = null
  if (swarms.length > 0) {
    action = { label: `Inspect ${hiveName(swarms[0])}`, href: `/dashboard/records?hive=${swarms[0].hiveId}&type=inspection` }
  } else if (due.length > 0) {
    action = { label: `Inspect ${due[0].apiary.name}`, href: `/dashboard/records?create=inspection&apiary=${due[0].apiary.id}` }
  }

  return { season: 'swarm', band: 'Swarm season', question: 'Are any about to swarm?', answer, rows, showForecast: true, action }
}

export function buildSeasonalLead(input: SeasonalLeadInput): SeasonalLead {
  const now = input.now ?? new Date()
  switch (getSeason(now)) {
    case 'autumn': return autumnLead(input, now)
    case 'spring': return springLead(input, now)
    case 'swarm': return swarmLead(input, now)
    default: return winterLead(input)
  }
}
