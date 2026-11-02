/** Resolves with `fallback` if the work has not finished in time. The work itself is not cancelled. */
export function withTimeout<T>(work: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<T>(resolve => {
    timer = setTimeout(() => resolve(fallback), ms)
  })
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer))
}
