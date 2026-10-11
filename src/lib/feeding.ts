/**
 * Whether a feed type is a sugar syrup, which is the only feed that can be
 * inverted. Matches the dropdown values ("Sugar Syrup (1:1)", "(3:2)",
 * "(2:1)") and any custom "Other" entry that starts the same way.
 */
export function isSugarSyrup(feedType: string): boolean {
  return /^sugar syrup/i.test(feedType.trim())
}
