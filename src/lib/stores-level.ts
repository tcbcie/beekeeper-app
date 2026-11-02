// Winter stores level: 0-100, where 100 means enough to get through winter (about 18 kg).
// A level is only ever a recorded reading: null means nobody has checked, which is never red.

export type StoresBand = 'low' | 'top_up' | 'enough'

export function storesBand(level: number): StoresBand {
  if (level < 40) return 'low'
  if (level < 80) return 'top_up'
  return 'enough'
}

const STORES_WORDS: Record<StoresBand, string> = {
  low: 'Low',
  top_up: 'Top up',
  enough: 'Enough',
}

export function storesWord(level: number): string {
  return STORES_WORDS[storesBand(level)]
}

export const STORES_BAND_TEXT_CLASSES: Record<StoresBand, string> = {
  low: 'text-red-800 dark:text-red-300',
  top_up: 'text-amber-800 dark:text-amber-300',
  enough: 'text-green-800 dark:text-green-300',
}

/**
 * The date readings must be taken on or after to count for the coming winter, or null from May
 * to July, when the dial is hidden. Hives are rarely opened from November to February, so an
 * autumn reading has to last, but it shouldn't still be showing the following summer.
 */
export function storesSeasonStart(today: string): string | null {
  const year = Number(today.slice(0, 4))
  const month = Number(today.slice(5, 7))
  if (month >= 5 && month <= 7) return null
  return `${month >= 8 ? year : year - 1}-08-01`
}
