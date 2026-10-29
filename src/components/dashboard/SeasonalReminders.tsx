import Panel from '@/components/ui/Panel'

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

/** This month's reminders, e.g. "October in Ireland". */
export default function SeasonalReminders() {
  const now = new Date()
  const month = now.toLocaleDateString('en-IE', { month: 'long' })
  const reminders = REMINDERS[now.getMonth()]

  return (
    <Panel padding="md">
      <h2 className="text-lg font-semibold text-foreground">{month} in Ireland</h2>
      <ul className="mt-2 space-y-1.5 list-disc pl-5 text-base text-foreground">
        {reminders.map(text => <li key={text}>{text}</li>)}
      </ul>
    </Panel>
  )
}
