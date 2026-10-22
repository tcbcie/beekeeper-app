/**
 * The single record from a PostgREST to-one embed.
 *
 * An embed through a foreign key on the selecting table (e.g. `hives.queen_id → queens(...)`)
 * comes back as an OBJECT at runtime, even though the generated typings suggest an array.
 * Reading it as an array (`x?.[0]`) is always undefined. This accepts either shape.
 */
export function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}
