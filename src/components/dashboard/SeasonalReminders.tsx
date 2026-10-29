import Panel from '@/components/ui/Panel'
import type { DashboardScaleSummary } from '@/types/dashboard'

// Two or three timely reminders for Irish beekeepers, one set per month. October's wording was
// agreed with the owner (29 October 2026); the others follow the same style and await their check.
const REMINDERS: readonly (readonly string[])[] = [
  /* January */ [
    'Heft hives or check scales; add fondant to any that feel light.',
    'Treat with oxalic acid if it was not done in December.',
    'Clear dead bees from entrances and check roofs after storms.',
  ],
  /* February */ [
    'Stores go fastest now as brood rearing starts: heft and feed fondant if light.',
    'On a mild day, clean or swap floors without opening the brood nest.',
    'Order frames, foundation and spare boxes for the season.',
  ],
  /* March */ [
    'First quick look on a warm, calm day: is the queen laying, are there stores?',
    'Feed if light; willow and gorse pollen should be coming in.',
    'Check the varroa drop to plan spring treatment.',
  ],
  /* April */ [
    'First full inspection at 15°C or more: queen, brood pattern, disease.',
    'Add a super when bees cover most frames.',
    'Get swarm-control kit ready: spare floor, box, roof and frames.',
  ],
  /* May */ [
    'Inspect every 7 to 9 days for queen cells: swarm season.',
    'Add supers ahead of need on the spring flow.',
    'Have your swarm-control method ready, such as an artificial swarm.',
  ],
  /* June */ [
    'Keep up 7 to 9 day checks while colonies still want to swarm.',
    'Watch stores in the June gap between spring and summer flows.',
    'A good month to raise queens or make up nucs.',
  ],
  /* July */ [
    'Supers on for the main flow: bramble, clover and lime.',
    'Take off spring honey before it sets in the comb.',
    'Watch for wasps; narrow the entrances of weaker colonies.',
  ],
  /* August */ [
    'Harvest and extract; take the supers off.',
    'Start varroa treatment straight after the harvest.',
    'Narrow entrances against wasps and robbing.',
  ],
  /* September */ [
    'Feed heavy syrup to bring stores to about 18 kg.',
    'Finish varroa treatment before the winter bees are raised.',
    'Unite weak colonies or those with a failing queen.',
  ],
  /* October */ [
    'Heft or check scales: a colony needs about 18 kg of stores for winter.',
    'Fit mouse guards before the first frosts.',
    'Plan oxalic acid for the broodless spell in December.',
  ],
  /* November */ [
    'Leave colonies undisturbed; check them from the outside.',
    'Strap hives and weigh down roofs against winter storms.',
    'Check mouse guards are still in place.',
  ],
  /* December */ [
    'Treat with oxalic acid in the broodless spell, usually mid to late December.',
    'Heft hives; add fondant to any that feel light.',
    'Clean and repair spare equipment.',
  ],
]

// Months (1–12) whose reminders are about stores, so the user's scales answer them:
// September to February, and June (the June gap). Agreed with the owner, 29 October 2026.
const STORES_MONTHS = [9, 10, 11, 12, 1, 2, 6]

interface SeasonalRemindersProps {
  /** Every scale summary on the dashboard (useScaleSummaries); empty until they load */
  scales: DashboardScaleSummary[]
}

/** This month's reminders, e.g. "October in Ireland", with the user's scales in stores months. */
export default function SeasonalReminders({ scales }: SeasonalRemindersProps) {
  const now = new Date()
  const month = now.toLocaleDateString('en-IE', { month: 'long' })
  const reminders = REMINDERS[now.getMonth()]

  // "34-DA -2.7 kg, 26-DA -2.1 kg, 29-DA +1.3 kg": lightest-going first
  const scaleLine = STORES_MONTHS.includes(now.getMonth() + 1)
    ? scales
        .filter((s): s is DashboardScaleSummary & { change7d: number } => typeof s.change7d === 'number')
        .sort((a, b) => a.change7d - b.change7d)
        .map(s => `${s.hiveNumber ?? 'a hive'} ${s.change7d > 0 ? '+' : ''}${s.change7d.toFixed(1)} kg`)
        .join(', ')
    : ''

  return (
    <Panel padding="md">
      <h2 className="text-lg font-semibold text-foreground">{month} in Ireland</h2>
      <ul className="mt-2 space-y-1.5 list-disc pl-5 text-base text-foreground">
        {reminders.map(text => <li key={text}>{text}</li>)}
      </ul>
      {scaleLine && (
        <div className="mt-3 border-t border-border pt-2">
          <h3 className="text-base font-semibold text-foreground">Your hives</h3>
          <p className="text-base text-text-secondary">Scales this week: {scaleLine}</p>
        </div>
      )}
    </Panel>
  )
}
