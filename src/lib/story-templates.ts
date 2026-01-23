// Story templates for public honey batch trace page

export interface StoryTemplate {
  id: string
  name: string
  description: string
  template: string
}

export const storyTemplates: StoryTemplate[] = [
  {
    id: 'floral-forager',
    name: 'Floral Forager',
    description: 'Taste & Nature Focus',
    template: `This golden jar is a snapshot of the [Season] bloom in [Location]. Our bees at [Apiary Name] foraged across miles of local hedgerows, visiting primarily [Floral Source 1] and [Floral Source 2]. This unique floral mix creates a [Taste Profile] honey that captures the true essence of the local landscape.`
  },
  {
    id: 'purist',
    name: 'The Purist',
    description: 'Raw & Process Focus',
    template: `Straight from the hive to your home. Harvested by [Beekeeper Name] on [Harvest Date], this honey is 100% raw and cold-extracted. We never pasteurize or fine-filter our honey, ensuring it retains all the natural pollen, enzymes, and delicate aromas of the [Location] countryside. Pure, unadulterated, and exactly as the bees intended.`
  },
  {
    id: 'terroir',
    name: 'The Terroir',
    description: 'Location Focus',
    template: `A true taste of [Location]. This batch was produced by our hives situated in [Apiary Name], just a stone's throw from [Local Landmark]. The bees gathered nectar during the [Weather Condition] days of [Month], resulting in a honey that is strictly local and fully traceable back to this single apiary.`
  },
  {
    id: 'seasonal-snapshot',
    name: 'Seasonal Snapshot',
    description: 'Time & Weather Focus',
    template: `Honey is the memory of summer. This specific jar (Batch [Batch Code]) was harvested during the [Season] season of [Year]. While the weather was [Weather Description], the bees were hard at work on [Floral Source], creating a honey with a distinct [Color] hue. Bottled with care in [Bottling Location].`
  }
]

export interface PlaceholderData {
  beekeeperName?: string
  floralSources?: string[]
  origins?: Array<{ name: string; city: string | null }>
  batchDate?: string
  batchCode?: string
}

function getSeason(month: number): string {
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return months[month] || 'summer'
}

function formatHarvestDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-IE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

export function replacePlaceholders(template: string, data: PlaceholderData): string {
  let result = template

  // Parse date info
  let season = 'summer'
  let month = 'summer'
  let year = new Date().getFullYear().toString()
  let harvestDate = '[Harvest Date]'

  if (data.batchDate) {
    const date = new Date(data.batchDate)
    const monthNum = date.getMonth()
    season = getSeason(monthNum)
    month = getMonthName(monthNum)
    year = date.getFullYear().toString()
    harvestDate = formatHarvestDate(data.batchDate)
  }

  // Get location from origins
  const location = data.origins?.[0]?.city
    ? `Co. ${data.origins[0].city}`
    : '[Location]'

  // Get apiary name
  const apiaryName = data.origins?.[0]?.name || '[Apiary Name]'

  // Get floral sources
  const floralSource1 = data.floralSources?.[0]?.toLowerCase() || '[Floral Source 1]'
  const floralSource2 = data.floralSources?.[1]?.toLowerCase() || data.floralSources?.[0]?.toLowerCase() || '[Floral Source 2]'
  const floralSource = data.floralSources?.[0]?.toLowerCase() || '[Floral Source]'

  // Replace known placeholders
  result = result.replace(/\[Season\]/g, season)
  result = result.replace(/\[Month\]/g, month)
  result = result.replace(/\[Year\]/g, year)
  result = result.replace(/\[Location\]/g, location)
  result = result.replace(/\[Apiary Name\]/g, apiaryName)
  result = result.replace(/\[Floral Source 1\]/g, floralSource1)
  result = result.replace(/\[Floral Source 2\]/g, floralSource2)
  result = result.replace(/\[Floral Source\]/g, floralSource)
  result = result.replace(/\[Beekeeper Name\]/g, data.beekeeperName || '[Beekeeper Name]')
  result = result.replace(/\[Harvest Date\]/g, harvestDate)
  result = result.replace(/\[Batch Code\]/g, data.batchCode || '[Batch Code]')

  // These remain as placeholders for user to fill
  // [Taste Profile], [Weather Condition], [Weather Description], [Local Landmark], [Color], [Bottling Location]

  return result
}

export function hasUnfilledPlaceholders(text: string): boolean {
  return /\[[^\]]+\]/.test(text)
}

export function getUnfilledPlaceholders(text: string): string[] {
  const matches = text.match(/\[[^\]]+\]/g)
  return matches ? [...new Set(matches)] : []
}
