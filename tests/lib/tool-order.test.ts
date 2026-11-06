import { describe, it, expect } from 'vitest'
import { applyToolOrder, moveTool, parseToolOrder, toggleFavourite, toolOrderIds, withFavourites } from '@/lib/tool-order'

const sections = [
  { name: 'Calculators', tools: [{ id: 'feeding' }, { id: 'fondant' }, { id: 'cells' }] },
  { name: 'Hive Health', tools: [{ id: 'varroa' }, { id: 'gdd' }, { id: 'tbr' }] },
]

describe('parseToolOrder', () => {
  it('keeps a list of ids', () => {
    expect(parseToolOrder(['tbr', 'gdd'])).toEqual(['tbr', 'gdd'])
  })

  it('treats anything else as the standard order', () => {
    expect(parseToolOrder(null)).toBeNull()
    expect(parseToolOrder([])).toBeNull()
    expect(parseToolOrder('tbr')).toBeNull()
    expect(parseToolOrder({ tbr: 1 })).toBeNull()
  })

  it('drops entries that are not ids', () => {
    expect(parseToolOrder(['tbr', 3, null])).toEqual(['tbr'])
  })
})

describe('applyToolOrder', () => {
  it('returns the standard order when nothing is saved', () => {
    expect(toolOrderIds(applyToolOrder(sections, null))).toEqual(['feeding', 'fondant', 'cells', 'varroa', 'gdd', 'tbr'])
  })

  it('sorts each section by the saved order and keeps sections in place', () => {
    const ordered = applyToolOrder(sections, ['cells', 'feeding', 'fondant', 'tbr', 'varroa', 'gdd'])
    expect(ordered.map(s => s.name)).toEqual(['Calculators', 'Hive Health'])
    expect(toolOrderIds(ordered)).toEqual(['cells', 'feeding', 'fondant', 'tbr', 'varroa', 'gdd'])
  })

  it('puts tools missing from the order after the saved ones, in their standard order', () => {
    const ordered = applyToolOrder(sections, ['tbr', 'cells'])
    expect(toolOrderIds(ordered)).toEqual(['cells', 'feeding', 'fondant', 'tbr', 'varroa', 'gdd'])
  })

  it('ignores ids it does not know', () => {
    expect(toolOrderIds(applyToolOrder(sections, ['old-tool', 'gdd']))).toEqual(['feeding', 'fondant', 'cells', 'gdd', 'varroa', 'tbr'])
  })

  it('does not change the sections it was given', () => {
    applyToolOrder(sections, ['cells'])
    expect(sections[0].tools[0].id).toBe('feeding')
  })
})

describe('moveTool', () => {
  it('moves a tool up and down within its section', () => {
    expect(toolOrderIds(moveTool(sections, 1, 2, -1))).toEqual(['feeding', 'fondant', 'cells', 'varroa', 'tbr', 'gdd'])
    expect(toolOrderIds(moveTool(sections, 0, 0, 1))).toEqual(['fondant', 'feeding', 'cells', 'varroa', 'gdd', 'tbr'])
  })

  it('never moves a tool out of its section', () => {
    expect(toolOrderIds(moveTool(sections, 0, 0, -1))).toEqual(toolOrderIds(sections))
    expect(toolOrderIds(moveTool(sections, 0, 2, 1))).toEqual(toolOrderIds(sections))
    expect(toolOrderIds(moveTool(sections, 5, 0, 1))).toEqual(toolOrderIds(sections))
  })
})

const ids = (list: { name: string; tools: { id: string }[] }[]) =>
  list.map(section => [section.name, section.tools.map(tool => tool.id)])

describe('withFavourites', () => {
  it('puts an empty Favourites section first when nothing is starred', () => {
    expect(ids(withFavourites(sections, null, 'Favourites'))).toEqual([
      ['Favourites', []],
      ['Calculators', ['feeding', 'fondant', 'cells']],
      ['Hive Health', ['varroa', 'gdd', 'tbr']],
    ])
  })

  it('moves starred tools to Favourites in their saved order, never in two places', () => {
    expect(ids(withFavourites(sections, ['tbr', 'feeding'], 'Favourites'))).toEqual([
      ['Favourites', ['tbr', 'feeding']],
      ['Calculators', ['fondant', 'cells']],
      ['Hive Health', ['varroa', 'gdd']],
    ])
  })

  it('ignores unknown and repeated ids', () => {
    expect(ids(withFavourites(sections, ['old-tool', 'gdd', 'gdd'], 'Favourites'))[0]).toEqual(['Favourites', ['gdd']])
  })
})

describe('toggleFavourite', () => {
  const arranged = withFavourites(sections, ['tbr'], 'Favourites')

  it('stars a tool by moving it to the end of Favourites', () => {
    expect(ids(toggleFavourite(arranged, 1, 1, sections))).toEqual([
      ['Favourites', ['tbr', 'fondant']],
      ['Calculators', ['feeding', 'cells']],
      ['Hive Health', ['varroa', 'gdd']],
    ])
  })

  it('unstars a tool by moving it to the end of its own section', () => {
    expect(ids(toggleFavourite(arranged, 0, 0, sections))).toEqual([
      ['Favourites', []],
      ['Calculators', ['feeding', 'fondant', 'cells']],
      ['Hive Health', ['varroa', 'gdd', 'tbr']],
    ])
  })

  it('leaves the sections unchanged for a tool that is not there', () => {
    expect(ids(toggleFavourite(arranged, 1, 9, sections))).toEqual(ids(arranged))
  })
})
