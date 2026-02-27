// Shared calculation functions for beekeeping tools

export interface InspectionData {
  inspection_date: string
  population_strength: number | null
  brood_pattern_rating: number | null
  temperament_rating: number | null
}

export interface QueenMetrics {
  age: number // months since installation
  broodScore: number // avg brood_pattern_rating
  productionScore: number // honey per hive
  consistencyScore: number // std deviation
  overallRating: number // weighted composite
}

// Hive Strength Analysis
export function analyzeHivePerformance(data: InspectionData[]) {
  if (data.length === 0) {
    return {
      avgPopulation: 0,
      avgBrood: 0,
      avgTemperament: 0,
      trend: 'unknown' as const,
      overallScore: 0,
      recommendations: ['No inspection data available. Conduct regular inspections to track hive strength.']
    }
  }

  // Filter out null values and calculate averages
  const validPopulation = data.filter(d => d.population_strength !== null)
  const validBrood = data.filter(d => d.brood_pattern_rating !== null)
  const validTemperament = data.filter(d => d.temperament_rating !== null)

  const avgPopulation = validPopulation.length > 0
    ? validPopulation.reduce((sum, d) => sum + (d.population_strength ?? 0), 0) / validPopulation.length
    : 0

  const avgBrood = validBrood.length > 0
    ? validBrood.reduce((sum, d) => sum + (d.brood_pattern_rating ?? 0), 0) / validBrood.length
    : 0

  const avgTemperament = validTemperament.length > 0
    ? validTemperament.reduce((sum, d) => sum + (d.temperament_rating ?? 0), 0) / validTemperament.length
    : 0

  // Calculate trend (comparing recent vs early data)
  let trend: 'improving' | 'declining' | 'stable' = 'stable'
  if (validPopulation.length >= 6) {
    const recentData = validPopulation.slice(-3)
    const earlyData = validPopulation.slice(0, 3)

    const recentAvg = recentData.reduce((sum, d) => sum + (d.population_strength ?? 0), 0) / recentData.length
    const earlyAvg = earlyData.reduce((sum, d) => sum + (d.population_strength ?? 0), 0) / earlyData.length

    if (recentAvg > earlyAvg + 0.3) trend = 'improving'
    else if (recentAvg < earlyAvg - 0.3) trend = 'declining'
  }

  // Overall score (weighted average, normalized to 0-100)
  const overallScore = Math.round(
    (avgPopulation * 0.4 + avgBrood * 0.4 + avgTemperament * 0.2) * 20
  )

  // Generate recommendations
  const recommendations: string[] = []
  if (avgPopulation < 2.5 && validPopulation.length > 0) {
    recommendations.push('⚠️ Low population - consider combining with stronger hive or re-queening')
  }
  if (avgBrood < 2.5 && validBrood.length > 0) {
    recommendations.push('⚠️ Poor brood pattern - check for queen issues or diseases')
  }
  if (avgTemperament < 2.5 && validTemperament.length > 0) {
    recommendations.push('⚠️ Aggressive behavior - consider re-queening with calmer genetics')
  }
  if (trend === 'declining') {
    recommendations.push('📉 Declining trend - investigate causes (varroa, disease, queenless)')
  }
  if (trend === 'improving') {
    recommendations.push('📈 Improving trend - hive is strengthening nicely')
  }
  if (overallScore >= 80) {
    recommendations.push('✅ Excellent hive - consider for breeding or splitting')
  }
  if (overallScore >= 60 && overallScore < 80) {
    recommendations.push('✓ Good hive - continue monitoring and maintenance')
  }
  if (recommendations.length === 0) {
    recommendations.push('Continue regular inspections and monitoring')
  }

  return {
    avgPopulation: Math.round(avgPopulation * 10) / 10,
    avgBrood: Math.round(avgBrood * 10) / 10,
    avgTemperament: Math.round(avgTemperament * 10) / 10,
    trend,
    overallScore,
    recommendations
  }
}

// Queen Performance Analysis
export function calculateQueenMetrics(
  ageMonths: number,
  avgBroodRating: number,
  totalHoneyKg: number,
  inspectionCount: number
): QueenMetrics {
  // Brood score (0-100)
  const broodScore = avgBroodRating * 20

  // Production score (normalized)
  // Assume 20kg average per hive per year is "good" (score 70)
  const productionScore = Math.min(100, (totalHoneyKg / 20) * 70)

  // Consistency score (based on number of inspections and age)
  // More inspections = more data = better consistency rating
  const consistencyScore = Math.min(100, (inspectionCount / ageMonths) * 50)

  // Overall rating (weighted composite)
  const overallRating = Math.round(
    broodScore * 0.5 +
    productionScore * 0.3 +
    consistencyScore * 0.2
  )

  return {
    age: ageMonths,
    broodScore: Math.round(broodScore),
    productionScore: Math.round(productionScore),
    consistencyScore: Math.round(consistencyScore),
    overallRating
  }
}

export function getQueenRating(score: number): {
  label: string
  color: string
  recommendation: string
} {
  if (score >= 85) {
    return {
      label: 'Excellent',
      color: 'text-green-600 dark:text-green-400',
      recommendation: 'Outstanding queen - ideal for breeding program'
    }
  } else if (score >= 70) {
    return {
      label: 'Good',
      color: 'text-blue-600 dark:text-blue-400',
      recommendation: 'Performing well - continue monitoring'
    }
  } else if (score >= 50) {
    return {
      label: 'Average',
      color: 'text-amber-600 dark:text-amber-400',
      recommendation: 'Acceptable performance - monitor for decline'
    }
  } else {
    return {
      label: 'Poor',
      color: 'text-red-600 dark:text-red-400',
      recommendation: 'Consider re-queening to improve hive performance'
    }
  }
}

// Treatment Schedule Calculations
export interface TreatmentTiming {
  canTreatNow: boolean
  nextSafeTreatment: Date | null
  withdrawalEnds: Date | null
  warnings: string[]
}

export function calculateTreatmentTiming(
  treatmentName: string,
  lastTreatmentDate: Date | null,
  honeySuperPresent: boolean,
  withdrawalPeriodDays: number,
  minIntervalDays: number = 0
): TreatmentTiming {
  const warnings: string[] = []
  const today = new Date()

  // Check honey super restriction
  let canTreatNow = true
  if (honeySuperPresent && withdrawalPeriodDays > 0) {
    canTreatNow = false
    warnings.push(`⚠️ Remove honey supers before applying ${treatmentName} (${withdrawalPeriodDays} day withdrawal period)`)
  }

  // Check minimum interval
  let nextSafeTreatment: Date | null = null
  if (lastTreatmentDate && minIntervalDays > 0) {
    const minDate = new Date(lastTreatmentDate)
    minDate.setDate(minDate.getDate() + minIntervalDays)

    if (minDate > today) {
      canTreatNow = false
      nextSafeTreatment = minDate
      const daysUntil = Math.ceil((minDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      warnings.push(`⏳ Wait ${daysUntil} days before next treatment (minimum ${minIntervalDays} day interval)`)
    }
  }

  // Calculate when withdrawal period ends (if treating now)
  let withdrawalEnds: Date | null = null
  if (withdrawalPeriodDays > 0 && canTreatNow) {
    withdrawalEnds = new Date(today)
    withdrawalEnds.setDate(withdrawalEnds.getDate() + withdrawalPeriodDays)
  }

  return {
    canTreatNow,
    nextSafeTreatment,
    withdrawalEnds,
    warnings
  }
}

// ===== PHASE 1: CALCULATOR FUNCTIONS =====

// Varroa Mite Drop Calculations
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export type ScreenType = 'full' | 'omf'

export interface VarroaDropResult {
  dailyDrop: number
  estimatedInfestation: number
  treatmentLevel: 'safe' | 'monitor' | 'urgent'
  message: string
  color: string
}

export function calculateVarroaDrop(
  miteCount: number,
  daysCount: number,
  screenType: ScreenType,
  season: Season
): VarroaDropResult {
  // Calculate daily drop
  const dailyDrop = miteCount / daysCount

  // Adjust for screen type (OMF may lose some mites through floor)
  const adjustedDailyDrop = screenType === 'omf' ? dailyDrop * 1.2 : dailyDrop

  // Estimate total infestation (varies by season due to brood levels)
  const multipliers = {
    spring: 80,
    summer: 100,
    autumn: 120,
    winter: 150
  }
  const estimatedInfestation = Math.round(adjustedDailyDrop * multipliers[season])

  // Determine treatment threshold (Ireland/UK standards)
  const thresholds = {
    spring: { monitor: 0.5, urgent: 1 },
    summer: { monitor: 1, urgent: 3 },
    autumn: { monitor: 10, urgent: 20 },
    winter: { monitor: 5, urgent: 10 }
  }

  let treatmentLevel: 'safe' | 'monitor' | 'urgent' = 'safe'
  let message = ''
  let color = ''

  if (adjustedDailyDrop < thresholds[season].monitor) {
    treatmentLevel = 'safe'
    message = 'Varroa levels are within acceptable range. Continue monitoring.'
    color = 'green'
  } else if (adjustedDailyDrop < thresholds[season].urgent) {
    treatmentLevel = 'monitor'
    message = 'Varroa levels are elevated. Monitor closely and prepare to treat.'
    color = 'amber'
  } else {
    treatmentLevel = 'urgent'
    message = 'Critical varroa levels! Treat immediately to prevent colony collapse.'
    color = 'red'
  }

  return {
    dailyDrop: Math.round(adjustedDailyDrop * 100) / 100,
    estimatedInfestation,
    treatmentLevel,
    message,
    color
  }
}

// Honey Super Calculations
export type FlowIntensity = 'weak' | 'moderate' | 'strong'

export interface HoneySuperRecommendation {
  addSuper: boolean
  removeSuper: boolean
  reasoning: string
  daysToFull: number | null
  harvestReadiness: number
  queenExcluder: boolean
}

export function calculateHoneySuperNeeds(
  currentSuperCount: number,
  framesFilled: number,
  hiveStrength: number,
  flowIntensity: FlowIntensity
): HoneySuperRecommendation {
  const framesPerSuper = 10
  const fillPercentage = (framesFilled / framesPerSuper) * 100

  // Flow rates (frames per day)
  const flowRates = {
    weak: 0.3,
    moderate: 0.7,
    strong: 1.2
  }

  const dailyFillRate = flowRates[flowIntensity] * (hiveStrength / 5)
  const emptyFrames = framesPerSuper - framesFilled
  const daysToFull = emptyFrames > 0 ? Math.ceil(emptyFrames / dailyFillRate) : 0

  let addSuper = false
  let removeSuper = false
  let reasoning = ''
  const queenExcluder = currentSuperCount > 0

  // Add super logic
  if (fillPercentage >= 80 && hiveStrength >= 3) {
    addSuper = true
    reasoning = `Current super is ${fillPercentage.toFixed(0)}% full. Add another super to prevent congestion and maintain honey flow.`
  } else if (fillPercentage >= 60 && hiveStrength >= 4 && flowIntensity === 'strong') {
    addSuper = true
    reasoning = `Strong flow detected and hive is very strong. Add super now to maximize honey production.`
  } else if (fillPercentage < 40 && flowIntensity === 'weak') {
    reasoning = `Only ${fillPercentage.toFixed(0)}% full and flow is weak. No need to add super yet.`
  } else {
    reasoning = `Current super is ${fillPercentage.toFixed(0)}% full. Monitor and add super when 70-80% full.`
  }

  // Remove super logic (for harvest)
  if (fillPercentage >= 90 && framesFilled >= 8) {
    removeSuper = true
    reasoning += ' Super is ready for harvest - most frames are capped.'
  }

  return {
    addSuper,
    removeSuper,
    reasoning,
    daysToFull: daysToFull > 0 ? daysToFull : null,
    harvestReadiness: fillPercentage,
    queenExcluder
  }
}

// ===== PHASE 3: UTILITY FUNCTIONS =====

// Apiary Location Analysis
export interface ApiaryScore {
  totalScore: number
  forageScore: number
  waterScore: number
  shelterScore: number
  accessScore: number
  recommendedCapacity: number
  improvements: string[]
  rating: 'excellent' | 'good' | 'fair' | 'poor'
}

export function analyzeApiaryLocation(
  forage: number, // 1-5
  waterDistance: number, // meters
  shelter: number, // 1-5
  access: number // 1-5
): ApiaryScore {
  // Weighted scoring
  const forageWeight = 0.35
  const waterWeight = 0.25
  const shelterWeight = 0.2
  const accessWeight = 0.2

  // Water proximity score (closer is better)
  const waterProximity =
    waterDistance <= 100 ? 5 :
    waterDistance <= 300 ? 4 :
    waterDistance <= 500 ? 3 :
    waterDistance <= 1000 ? 2 : 1

  const totalScore = Math.round(
    (forage * forageWeight +
    waterProximity * waterWeight +
    shelter * shelterWeight +
    access * accessWeight) * 20
  )

  // Recommended capacity based on forage and water
  const baseCapacity = 10
  const forageMultiplier = forage / 3
  const waterMultiplier = waterProximity / 3
  const recommendedCapacity = Math.round(baseCapacity * forageMultiplier * waterMultiplier)

  // Generate improvements
  const improvements: string[] = []
  if (forage < 3) improvements.push('Consider planting bee-friendly flowers or moving to better forage area')
  if (waterDistance > 500) improvements.push('Provide water source closer to apiary (within 500m ideal)')
  if (shelter < 3) improvements.push('Add windbreaks or relocate to more sheltered position')
  if (access < 3) improvements.push('Improve access path for easier hive management')

  if (improvements.length === 0) {
    improvements.push('Excellent location - maintain current conditions')
  }

  const rating =
    totalScore >= 80 ? 'excellent' :
    totalScore >= 60 ? 'good' :
    totalScore >= 40 ? 'fair' : 'poor'

  return {
    totalScore,
    forageScore: Math.round(forage * 20),
    waterScore: Math.round(waterProximity * 20),
    shelterScore: Math.round(shelter * 20),
    accessScore: Math.round(access * 20),
    recommendedCapacity,
    improvements,
    rating
  }
}

// Seasonal Tasks
export interface SeasonalTasks {
  month: string
  critical: string[]
  recommended: string[]
  optional: string[]
}

export function getSeasonalTasks(month: number): SeasonalTasks {
  const tasks: Record<number, SeasonalTasks> = {
    1: {
      month: 'January',
      critical: ['Check hive entrances are clear of snow/debris', 'Ensure ventilation is adequate', 'Monitor food stores without opening hive'],
      recommended: ['Oxalic acid treatment if brood-free', 'Order spring equipment and supplies'],
      optional: ['Read beekeeping books and plan for season', 'Maintain and repair equipment']
    },
    2: {
      month: 'February',
      critical: ['Check food stores - emergency feed if light', 'Clear snow from hive entrances', 'Monitor for signs of life on warm days'],
      recommended: ['Heft hives to assess stores weight', 'Plan spring management strategy'],
      optional: ['Attend beekeeping association meetings', 'Prepare frames and foundation']
    },
    3: {
      month: 'March',
      critical: ['First full inspection on warm day (15°C+)', 'Assess winter losses', 'Check for laying queen', 'Clean entrance and floor'],
      recommended: ['Equalize colonies if needed', 'Begin 1:1 feeding if stores low', 'Check for signs of disease'],
      optional: ['Unite weak colonies', 'Start queen rearing preparations']
    },
    4: {
      month: 'April',
      critical: ['Weekly inspections begin', 'Swarm prevention - add supers', 'Check for queen cells', 'Expand brood box if needed'],
      recommended: ['First varroa check', 'Clean and sterilize old equipment', 'Make splits from strong colonies'],
      optional: ['Collect propolis', 'Start nucleus colonies']
    },
    5: {
      month: 'May',
      critical: ['Peak swarm season - inspect every 7 days', 'Add supers before congestion', 'Monitor queen cells closely'],
      recommended: ['Perform artificial swarms if needed', 'Make increase from strong stocks', 'Begin queen rearing'],
      optional: ['Collect swarms', 'Enter local honey shows']
    },
    6: {
      month: 'June',
      critical: ['Continue weekly swarm inspections', 'Add supers as needed', 'Monitor honey flow'],
      recommended: ['First honey harvest if supers full', 'Check queen performance', 'Re-queen poor performers'],
      optional: ['Introduce new queens', 'Make late splits']
    },
    7: {
      month: 'July',
      critical: ['Main honey harvest', 'Check food stores after harvest', 'Begin varroa monitoring'],
      recommended: ['Unite colonies if needed', 'Feed harvested colonies', 'Treat for varroa after honey off'],
      optional: ['Extract and jar honey', 'Assess queen performance']
    },
    8: {
      month: 'August',
      critical: ['Varroa treatment (Apiguard/ApiLife)', 'Feed colonies for winter', 'Reduce entrances against wasps'],
      recommended: ['Unite weak colonies', 'Remove failing queens', 'Final honey harvest'],
      optional: ['Collect late summer honey', 'Begin mouse guard installation']
    },
    9: {
      month: 'September',
      critical: ['Complete varroa treatment', 'Feed for winter stores (20kg minimum)', 'Install mouse guards', 'Reduce entrances'],
      recommended: ['Final inspections before winter', 'Clear up apiary', 'Store spare equipment'],
      optional: ['Ivy honey harvest', 'Plan winter projects']
    },
    10: {
      month: 'October',
      critical: ['Ensure adequate winter stores', 'Complete winter preparations', 'Check hive security'],
      recommended: ['Final varroa check', 'Wrap hives if in exposed location'],
      optional: ['Clean and store extracted frames', 'Process wax']
    },
    11: {
      month: 'November',
      critical: ['Check hive security against storms', 'Ensure good ventilation', 'Monitor from outside only'],
      recommended: ['Heft hives to check stores'],
      optional: ['Plan next year\'s beekeeping', 'Maintain equipment']
    },
    12: {
      month: 'December',
      critical: ['Oxalic acid treatment on warm day', 'Check hives after storms', 'Clear entrances of debris'],
      recommended: ['Monitor food stores by hefting', 'Order spring supplies'],
      optional: ['Read beekeeping literature', 'Repair and paint equipment']
    }
  }

  return tasks[month] || tasks[1]
}
