import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import path from 'path'
import manifest from '../../public/manifest.json'

/**
 * The Inspections shortcut shipped pointing at /dashboard/inspections, which is
 * not a route, so it 404'd from the installed app's home screen.
 *
 * The existing manifest test only checks that a shortcut URL starts with "/",
 * which is precisely why that got through. These assertions resolve each URL
 * against the App Router tree instead.
 */

const APP_DIR = path.resolve(__dirname, '../../src/app')

interface Shortcut {
  name: string
  url: string
}

const shortcuts: Shortcut[] = manifest.shortcuts ?? []

/** True when a pathname resolves to a real App Router page. */
function routeExists(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean)

  // Exact match: src/app/<segments>/page.tsx
  const exact = path.join(APP_DIR, ...segments, 'page.tsx')
  if (existsSync(exact)) return true

  // Route groups, e.g. src/app/(public)/<segments>/page.tsx
  for (const group of ['(public)', '(auth)']) {
    if (existsSync(path.join(APP_DIR, group, ...segments, 'page.tsx'))) return true
  }

  return false
}

describe('manifest shortcuts', () => {
  it('declares at least one shortcut', () => {
    expect(shortcuts.length).toBeGreaterThan(0)
  })

  it.each(shortcuts.map(s => [s.name, s.url] as const))(
    '%s resolves to a real route (%s)',
    (_name, url) => {
      const pathname = url.split('?')[0]
      expect(routeExists(pathname)).toBe(true)
    }
  )

  it('opens the inspection flow rather than a non-existent page', () => {
    const inspections = shortcuts.find(s => s.name === 'Inspections')
    expect(inspections).toBeDefined()
    // Regression guard for the exact URL that shipped broken.
    expect(inspections!.url).not.toBe('/dashboard/inspections')
    // The records screen creates every record type from a query parameter.
    expect(inspections!.url).toContain('/dashboard/records')
    expect(inspections!.url).toContain('create=inspection')
  })

  it('uses query parameters the records page actually accepts', () => {
    const recordsPage = path.join(APP_DIR, 'dashboard', 'records', 'page.tsx')
    expect(existsSync(recordsPage)).toBe(true)

    for (const shortcut of shortcuts) {
      const [, query] = shortcut.url.split('?')
      if (!query) continue
      for (const key of new URLSearchParams(query).keys()) {
        expect(['create', 'type', 'hive', 'apiary', 'record']).toContain(key)
      }
    }
  })
})
