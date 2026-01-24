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

// Marker for auto-inserted values: <<value>>
// These are highlighted in preview and stripped on save

export function replacePlaceholders(template: string, data: PlaceholderData): string {
  let result = template

  // Helper to wrap value in markers (only if it's not a placeholder)
  const mark = (value: string, fallback: string) => {
    if (value === fallback || value.startsWith('[')) return value
    return `<<${value}>>`
  }

  // Parse date info
  let season = '[Season]'
  let month = '[Month]'
  let year = '[Year]'
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
  const location = data.origins?.[0]?.city || '[Location]'

  // Get apiary name
  const apiaryName = data.origins?.[0]?.name || '[Apiary Name]'

  // Get floral sources (don't duplicate if only one source)
  const floralSource1 = data.floralSources?.[0]?.toLowerCase() || '[Floral Source 1]'
  const floralSource2 = data.floralSources?.[1]?.toLowerCase() || '[Floral Source 2]'
  const floralSource = data.floralSources?.[0]?.toLowerCase() || '[Floral Source]'

  // Replace known placeholders with marked values
  result = result.replace(/\[Season\]/g, mark(season, '[Season]'))
  result = result.replace(/\[Month\]/g, mark(month, '[Month]'))
  result = result.replace(/\[Year\]/g, mark(year, '[Year]'))
  result = result.replace(/\[Location\]/g, mark(location, '[Location]'))
  result = result.replace(/\[Apiary Name\]/g, mark(apiaryName, '[Apiary Name]'))
  result = result.replace(/\[Floral Source 1\]/g, mark(floralSource1, '[Floral Source 1]'))
  result = result.replace(/\[Floral Source 2\]/g, mark(floralSource2, '[Floral Source 2]'))
  result = result.replace(/\[Floral Source\]/g, mark(floralSource, '[Floral Source]'))
  result = result.replace(/\[Beekeeper Name\]/g, mark(data.beekeeperName || '[Beekeeper Name]', '[Beekeeper Name]'))
  result = result.replace(/\[Harvest Date\]/g, mark(harvestDate, '[Harvest Date]'))
  result = result.replace(/\[Batch Code\]/g, mark(data.batchCode || '[Batch Code]', '[Batch Code]'))

  // These remain as placeholders for user to fill
  // [Taste Profile], [Weather Condition], [Weather Description], [Local Landmark], [Color], [Bottling Location]

  return result
}

// Strip <<markers>> from text for saving
export function stripMarkers(text: string): string {
  return text.replace(/<<([^>]+)>>/g, '$1')
}

// Check if text has auto-inserted markers
export function hasMarkers(text: string): boolean {
  return /<<[^>]+>>/.test(text)
}

export function hasUnfilledPlaceholders(text: string): boolean {
  return /\[[^\]]+\]/.test(text)
}

export function getUnfilledPlaceholders(text: string): string[] {
  const matches = text.match(/\[[^\]]+\]/g)
  return matches ? [...new Set(matches)] : []
}
