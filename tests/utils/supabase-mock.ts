/**
 * A stand-in for a PostgREST query builder. Every builder method (select, eq, in, or, order,
 * is, limit, single, insert, update, ...) returns the same object, and awaiting it resolves to
 * `result`. This keeps tests independent of the exact chain a page builds, so adding a filter
 * to a query doesn't break unrelated tests.
 *
 * Pass `spies` to record calls to particular methods (for example `{ insert: mockInsert }`)
 * while the chain carries on.
 */
export interface MockQueryResult {
  data: unknown
  error: unknown
  count?: number | null
}

type Spy = (...args: unknown[]) => unknown

export function mockQuery(
  result: MockQueryResult = { data: [], error: null },
  spies: Record<string, Spy> = {}
): unknown {
  const proxy: unknown = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve: (value: MockQueryResult) => unknown, reject: (reason: unknown) => unknown) =>
            Promise.resolve(result).then(resolve, reject)
        }
        return (...args: unknown[]) => {
          if (typeof prop === 'string') spies[prop]?.(...args)
          return proxy
        }
      },
    }
  )
  return proxy
}
