/**
 * Tools card order: each beekeeper can arrange the cards within each section of the Tools page.
 * The order is saved as a list of tool ids in profiles.tool_order (NULL = the standard order).
 * See docs/features/tools-card-order.md.
 */

interface OrderableSection {
  tools: readonly { id: string }[]
}

/** Reads a saved tool_order value. Only a non-empty list of ids counts; anything else means the standard order. */
export function parseToolOrder(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const ids = value.filter((id): id is string => typeof id === 'string')
  return ids.length > 0 ? ids : null
}

/**
 * Sorts each section's tools by the saved order. A tool missing from the order (one added in a
 * later release) keeps its standard place after the saved ones. Unknown ids are ignored.
 */
export function applyToolOrder<S extends OrderableSection>(sections: readonly S[], order: readonly string[] | null): S[] {
  if (!order) return [...sections]
  const rank = new Map(order.map((id, index) => [id, index]))
  const rankOf = (id: string) => rank.get(id) ?? order.length
  return sections.map(section => ({
    ...section,
    // Array sort is stable, so unranked tools stay in their standard order
    tools: [...section.tools].sort((a, b) => rankOf(a.id) - rankOf(b.id)) as S['tools'],
  }))
}

/** Swaps a tool with its neighbour in the same section. Out-of-range moves return the sections unchanged. */
export function moveTool<S extends OrderableSection>(sections: readonly S[], sectionIndex: number, toolIndex: number, direction: -1 | 1): S[] {
  const section = sections[sectionIndex]
  const target = toolIndex + direction
  if (!section || toolIndex < 0 || target < 0 || target >= section.tools.length) return [...sections]
  const tools = [...section.tools]
  ;[tools[toolIndex], tools[target]] = [tools[target], tools[toolIndex]]
  return sections.map((s, i) => (i === sectionIndex ? { ...s, tools: tools as S['tools'] } : s))
}

/** Every tool id in the order shown, section by section. */
export function toolOrderIds(sections: readonly OrderableSection[]): string[] {
  return sections.flatMap(section => section.tools.map(tool => tool.id))
}

interface NamedSection<T extends { id: string }> {
  name: string
  tools: T[]
}

/**
 * Puts the starred tools in a Favourites section first, in their saved order, and takes them out
 * of their usual sections, so a tool is never in two places. Unknown and repeated ids are ignored.
 * The Favourites section is always first, even when empty.
 */
export function withFavourites<T extends { id: string }>(
  sections: readonly NamedSection<T>[],
  favourites: readonly string[] | null,
  name: string,
): NamedSection<T>[] {
  const byId = new Map(sections.flatMap(section => section.tools.map(tool => [tool.id, tool] as const)))
  const starred: T[] = []
  for (const id of favourites ?? []) {
    const tool = byId.get(id)
    if (tool && !starred.includes(tool)) starred.push(tool)
  }
  const starredIds = new Set(starred.map(tool => tool.id))
  return [
    { name, tools: starred },
    ...sections.map(section => ({ ...section, tools: section.tools.filter(tool => !starredIds.has(tool.id)) })),
  ]
}

/**
 * Stars or unstars a tool in a list built by withFavourites (Favourites is section 0). Starring
 * moves the tool to the end of Favourites; unstarring moves it to the end of its home section,
 * found in `standard`. Anything out of range returns the sections unchanged.
 */
export function toggleFavourite<T extends { id: string }>(
  sections: readonly NamedSection<T>[],
  sectionIndex: number,
  toolIndex: number,
  standard: readonly NamedSection<{ id: string }>[],
): NamedSection<T>[] {
  const tool = sections[sectionIndex]?.tools[toolIndex]
  if (!tool) return [...sections]
  let target = 0
  if (sectionIndex === 0) {
    const homeName = standard.find(section => section.tools.some(t => t.id === tool.id))?.name
    target = sections.findIndex((section, index) => index > 0 && section.name === homeName)
    if (target < 0) return [...sections]
  }
  return sections.map((section, index) => {
    if (index === sectionIndex) return { ...section, tools: section.tools.filter((_, i) => i !== toolIndex) }
    if (index === target) return { ...section, tools: [...section.tools, tool] }
    return section
  })
}
