/**
 * Whether a feed type is a syrup, which is the only feed that can be
 * inverted. Matches "syrup" anywhere, so it covers the dropdown values
 * ("Sugar Syrup (1:1)", "(3:2)", "(2:1)") and custom "Other" entries such as
 * "Ambrosia syrup" or "Inverted sugar syrup".
 */
export function isSyrupFeed(feedType: string): boolean {
  return /syrup/i.test(feedType)
}

/** The form stores "L" and older records "liters", so a hive's litres add up as one amount */
export function normaliseUnit(unit: string | null): string {
  const text = unit?.trim() ?? ''
  return /^(l|lit(er|re)s?)$/i.test(text) ? 'L' : text
}

export interface FeedSummary {
  /** How many feeds, including those with no amount recorded */
  times: number
  /** Totals such as "12 L syrup" or "2 kg Fondant" */
  amounts: string[]
}

/**
 * Totals a hive's feeds for the hive card. Every syrup adds up as one "syrup"; any other feed is
 * totalled by its own name. Amounts only add within the same unit: litres and kilos never sum.
 */
export function summariseFeeds(
  feeds: Array<{ feed_type: string | null; quantity: number | null; unit: string | null }>
): FeedSummary {
  const totals = new Map<string, { amount: number; unit: string; feed: string }>()
  for (const f of feeds) {
    if (f.quantity == null) continue
    const feedType = f.feed_type?.trim() ?? ''
    const feed = isSyrupFeed(feedType) ? 'syrup' : feedType || 'feed'
    const unit = normaliseUnit(f.unit)
    const key = `${feed.toLowerCase()}|${unit}`
    const total = totals.get(key)
    if (total) total.amount += Number(f.quantity)
    else totals.set(key, { amount: Number(f.quantity), unit, feed })
  }
  const amounts = Array.from(totals.values(), ({ amount, unit, feed }) => {
    const rounded = Math.round(amount * 100) / 100
    return unit ? `${rounded} ${unit} ${feed}` : `${rounded} ${feed} (no unit)`
  })
  return { times: feeds.length, amounts }
}
