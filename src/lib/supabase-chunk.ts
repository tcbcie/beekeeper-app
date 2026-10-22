/**
 * Run a `.in(column, ids)` query in chunks so a long id list can't exceed the URL length limit.
 *
 * PostgREST puts `.in()` values in the URL, so a few hundred UUIDs (a breeder queen's daughters,
 * every queen in an account) make the request fail. The chunks run together and their rows are
 * merged. The first error, if any, is returned, so existing `if (error)` handling still works.
 *
 * `order` and `limit` apply per chunk: when the caller relies on them, re-sort (and re-cut) the
 * merged rows.
 */
export const IN_CHUNK_SIZE = 100

export async function fetchInChunks<T>(
  ids: readonly string[],
  query: (chunk: string[]) => PromiseLike<{ data: T[] | null; error: unknown }>,
  chunkSize: number = IN_CHUNK_SIZE
): Promise<{ data: T[]; error: unknown }> {
  if (ids.length === 0) return { data: [], error: null }
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += chunkSize) chunks.push(ids.slice(i, i + chunkSize))

  const results = await Promise.all(chunks.map(chunk => query(chunk)))
  const error = results.find(r => r.error)?.error ?? null
  return { data: results.flatMap(r => r.data ?? []), error }
}

/**
 * Run `fn` over `items` a few at a time and return the results in the original order.
 * Much faster than one after another, without firing every request at once (vendor APIs,
 * the browser's connection limit, or one database under export load).
 */
export async function mapInGroups<T, R>(items: readonly T[], fn: (item: T) => Promise<R>, size = 5): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(...await Promise.all(items.slice(i, i + size).map(fn)))
  }
  return out
}
