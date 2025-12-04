// External data loading for beekeeping tools

export interface VarroaTreatment {
  product: string
  activeIngredient: string
  applicationMethod: string
  withdrawalPeriodDays: number
  minIntervalDays: number
  minTemperature?: number
  maxTemperature?: number
  notes: string
  seasonalRestrictions?: string
}

// Ireland-approved Varroa treatments (as of 2024)
// Data based on DAFM approved treatments
export const APPROVED_TREATMENTS: VarroaTreatment[] = [
  {
    product: 'Apiguard',
    activeIngredient: 'Thymol 25g',
    applicationMethod: 'Gel tray on top bars',
    withdrawalPeriodDays: 0,
    minIntervalDays: 14,
    minTemperature: 15,
    maxTemperature: 30,
    notes: 'Apply 2 trays, 2 weeks apart. Remove honey supers during treatment.',
    seasonalRestrictions: 'Best in August-September'
  },
  {
    product: 'ApiLife Var',
    activeIngredient: 'Thymol, Eucalyptol, Menthol, Camphor',
    applicationMethod: 'Tablets on top bars',
    withdrawalPeriodDays: 0,
    minIntervalDays: 7,
    minTemperature: 15,
    maxTemperature: 30,
    notes: 'Apply 3-4 tablets in sequence, 7-10 days apart. Treatment duration 25-35 days.',
    seasonalRestrictions: 'Best in late summer/autumn'
  },
  {
    product: 'Oxalic Acid (Sublimation)',
    activeIngredient: 'Oxalic acid dihydrate',
    applicationMethod: 'Sublimation/vaporization',
    withdrawalPeriodDays: 0,
    minIntervalDays: 5,
    minTemperature: 0,
    notes: 'Most effective when brood-free (winter). Repeat 3-4 times at 5-7 day intervals.',
    seasonalRestrictions: 'Winter treatment (December-January)'
  },
  {
    product: 'Oxalic Acid (Trickling)',
    activeIngredient: 'Oxalic acid dihydrate in sugar solution',
    applicationMethod: 'Trickle between frames',
    withdrawalPeriodDays: 0,
    minIntervalDays: 0,
    minTemperature: 4,
    notes: 'Single treatment when brood-free. 5ml per seam of bees.',
    seasonalRestrictions: 'Winter treatment (November-February)'
  },
  {
    product: 'Apistan',
    activeIngredient: 'Tau-fluvalinate',
    applicationMethod: 'Plastic strips hung between frames',
    withdrawalPeriodDays: 42,
    minIntervalDays: 0,
    notes: 'Leave strips for 6-8 weeks. Remove before honey flow. Resistance reported in some areas.',
    seasonalRestrictions: 'Spring or autumn (no honey supers)'
  },
  {
    product: 'Bayvarol',
    activeIngredient: 'Flumethrin',
    applicationMethod: 'Plastic strips hung between frames',
    withdrawalPeriodDays: 0,
    minIntervalDays: 0,
    notes: 'Leave strips for 6-8 weeks. Can be used with supers on.',
    seasonalRestrictions: 'Spring or autumn'
  },
  {
    product: 'MAQS (Mite Away Quick Strips)',
    activeIngredient: 'Formic acid',
    applicationMethod: 'Gel strips on top bars',
    withdrawalPeriodDays: 0,
    minIntervalDays: 0,
    minTemperature: 10,
    maxTemperature: 29,
    notes: '7-day treatment. Can be used with supers. Temperature sensitive.',
    seasonalRestrictions: 'Spring or autumn (watch temperatures)'
  }
]

export function getTreatmentsByseason(season: 'spring' | 'summer' | 'autumn' | 'winter'): VarroaTreatment[] {
  const seasonMap: Record<string, string[]> = {
    spring: ['Bayvarol', 'Apistan', 'MAQS'],
    summer: ['Apiguard', 'ApiLife Var', 'MAQS'],
    autumn: ['Apiguard', 'ApiLife Var', 'Bayvarol', 'Apistan', 'MAQS'],
    winter: ['Oxalic Acid (Sublimation)', 'Oxalic Acid (Trickling)']
  }

  const suitableProducts = seasonMap[season] || []
  return APPROVED_TREATMENTS.filter(t =>
    suitableProducts.some(name => t.product.includes(name))
  )
}

export function getCurrentSeason(): 'spring' | 'summer' | 'autumn' | 'winter' {
  const month = new Date().getMonth() + 1 // 1-12

  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

export function getTreatmentByName(name: string): VarroaTreatment | undefined {
  return APPROVED_TREATMENTS.find(t => t.product === name)
}

// Helper to check if treatment is suitable for current conditions
export function isTreatmentSuitable(
  treatment: VarroaTreatment,
  currentTemp: number | null,
  honeySuperPresent: boolean
): { suitable: boolean; reasons: string[] } {
  const reasons: string[] = []
  let suitable = true

  // Check temperature
  if (currentTemp !== null) {
    if (treatment.minTemperature && currentTemp < treatment.minTemperature) {
      suitable = false
      reasons.push(`Temperature too low (min ${treatment.minTemperature}°C)`)
    }
    if (treatment.maxTemperature && currentTemp > treatment.maxTemperature) {
      suitable = false
      reasons.push(`Temperature too high (max ${treatment.maxTemperature}°C)`)
    }
  }

  // Check honey super
  if (honeySuperPresent && treatment.withdrawalPeriodDays > 0) {
    suitable = false
    reasons.push(`Remove honey supers (${treatment.withdrawalPeriodDays} day withdrawal)`)
  }

  if (suitable) {
    reasons.push('✓ Suitable for current conditions')
  }

  return { suitable, reasons }
}

// Ireland Beekeeping Associations Directory
export interface Association {
  name: string
  county: string
  region: string
  contact?: string
  email?: string
  website?: string
  description?: string
}

export const IRELAND_ASSOCIATIONS: Association[] = [
  // Leinster
  {
    name: 'Dublin Beekeepers Association',
    county: 'Dublin',
    region: 'Leinster',
    website: 'http://www.dublinbeekeepers.com',
    email: 'info@dublinbeekeepers.com',
    description: 'One of Ireland\'s oldest and largest beekeeping associations'
  },
  {
    name: 'Fingal Beekeepers',
    county: 'Dublin',
    region: 'Leinster',
    website: 'http://www.fingalbeekeepers.com',
    description: 'Serving North County Dublin and surrounding areas'
  },
  {
    name: 'Wicklow Beekeepers Association',
    county: 'Wicklow',
    region: 'Leinster',
    website: 'http://www.wicklowbeekeepers.ie',
    description: 'Supporting beekeepers in County Wicklow'
  },
  {
    name: 'Kildare Beekeepers Association',
    county: 'Kildare',
    region: 'Leinster',
    description: 'Active beekeeping community in County Kildare'
  },
  {
    name: 'Wexford Beekeepers Association',
    county: 'Wexford',
    region: 'Leinster',
    description: 'Promoting beekeeping in the sunny southeast'
  },
  {
    name: 'Laois Beekeepers Association',
    county: 'Laois',
    region: 'Leinster',
    description: 'Supporting beekeepers in County Laois'
  },
  {
    name: 'Meath Beekeepers Association',
    county: 'Meath',
    region: 'Leinster',
    description: 'Royal County beekeeping community'
  },

  // Munster
  {
    name: 'Cork Beekeepers Association',
    county: 'Cork',
    region: 'Munster',
    website: 'http://www.corkbee.ie',
    description: 'Largest beekeeping association in Munster'
  },
  {
    name: 'Kerry Beekeepers Association',
    county: 'Kerry',
    region: 'Munster',
    description: 'Kingdom beekeepers supporting the craft'
  },
  {
    name: 'Limerick Beekeepers Association',
    county: 'Limerick',
    region: 'Munster',
    description: 'Treaty County beekeeping community'
  },
  {
    name: 'Waterford Beekeepers Association',
    county: 'Waterford',
    region: 'Munster',
    description: 'Beekeeping in the Deise'
  },
  {
    name: 'Tipperary Beekeepers Association',
    county: 'Tipperary',
    region: 'Munster',
    description: 'Premier County beekeepers'
  },
  {
    name: 'Clare Beekeepers Association',
    county: 'Clare',
    region: 'Munster',
    description: 'Banner County beekeeping association'
  },

  // Connacht
  {
    name: 'Galway Beekeepers Association',
    county: 'Galway',
    region: 'Connacht',
    description: 'Tribal County beekeeping community'
  },
  {
    name: 'Mayo Beekeepers Association',
    county: 'Mayo',
    region: 'Connacht',
    description: 'Supporting beekeepers in the West'
  },
  {
    name: 'Sligo Beekeepers Association',
    county: 'Sligo',
    region: 'Connacht',
    description: 'Yeats County beekeepers'
  },
  {
    name: 'Roscommon Beekeepers Association',
    county: 'Roscommon',
    region: 'Connacht',
    description: 'Beekeeping in the heartland'
  },
  {
    name: 'Leitrim Beekeepers',
    county: 'Leitrim',
    region: 'Connacht',
    description: 'Small but active beekeeping group'
  },

  // Ulster (Republic of Ireland)
  {
    name: 'Cavan Beekeepers Association',
    county: 'Cavan',
    region: 'Ulster',
    description: 'Breffni County beekeepers'
  },
  {
    name: 'Monaghan Beekeepers Association',
    county: 'Monaghan',
    region: 'Ulster',
    description: 'Oriel County beekeeping community'
  },
  {
    name: 'Donegal Beekeepers Association',
    county: 'Donegal',
    region: 'Ulster',
    description: 'Northernmost beekeepers in Ireland'
  }
]

export function getAssociationsByCounty(county: string): Association[] {
  return IRELAND_ASSOCIATIONS.filter(
    a => a.county.toLowerCase() === county.toLowerCase()
  )
}

export function getAssociationsByRegion(region: string): Association[] {
  return IRELAND_ASSOCIATIONS.filter(
    a => a.region.toLowerCase() === region.toLowerCase()
  )
}

export function getAllCounties(): string[] {
  const counties = new Set(IRELAND_ASSOCIATIONS.map(a => a.county))
  return Array.from(counties).sort()
}

export function getAllRegions(): string[] {
  return ['Leinster', 'Munster', 'Connacht', 'Ulster']
}
