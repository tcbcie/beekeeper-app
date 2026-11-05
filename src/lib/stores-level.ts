// Winter stores level: 0-100, where 100 means enough to get through winter (about 18 kg).
// A level is only ever a recorded reading: null means nobody has checked, which is never red.

import { getCurrentDate, parseLocalDate } from '@/lib/date-utils'

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

/** The bands in words, for the inspection form's scale */
export const STORES_BANDS_TEXT = 'Low under 40% · Top up 40–79% · Enough 80% and over'

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

/**
 * The day a reading was taken: "28 August", with the year when it is from an earlier year (a
 * December reading seen in February), so an old estimate never passes for a recent one.
 */
export function formatStoresDate(date: string | null | undefined, today: string = getCurrentDate()): string | null {
  if (!date) return null
  const parsed = parseLocalDate(date)
  if (Number.isNaN(parsed.getTime())) return null
  const options: Intl.DateTimeFormatOptions = date.slice(0, 4) === today.slice(0, 4)
    ? { day: 'numeric', month: 'long' }
    : { day: 'numeric', month: 'long', year: 'numeric' }
  return parsed.toLocaleDateString('en-IE', options)
}
