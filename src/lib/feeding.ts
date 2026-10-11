/**
 * Whether a feed type is a syrup, which is the only feed that can be
 * inverted. Matches "syrup" anywhere, so it covers the dropdown values
 * ("Sugar Syrup (1:1)", "(3:2)", "(2:1)") and custom "Other" entries such as
 * "Ambrosia syrup" or "Inverted sugar syrup".
 */
export function isSyrupFeed(feedType: string): boolean {
  return /syrup/i.test(feedType)
}
