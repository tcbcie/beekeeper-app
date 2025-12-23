import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * PWA Manifest Validation Tests
 *
 * These tests verify that the manifest.json file meets all PWA requirements
 * for the install prompt to appear on mobile devices.
 */
describe('PWA Manifest Validation', () => {
  let manifest: Record<string, unknown>

  beforeAll(() => {
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.json')
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8')
    manifest = JSON.parse(manifestContent)
  })

  describe('Required Fields', () => {
    it('should have a name', () => {
      expect(manifest.name).toBeDefined()
      expect(typeof manifest.name).toBe('string')
      expect((manifest.name as string).length).toBeGreaterThan(0)
    })

    it('should have a short_name', () => {
      expect(manifest.short_name).toBeDefined()
      expect(typeof manifest.short_name).toBe('string')
      expect((manifest.short_name as string).length).toBeLessThanOrEqual(12) // Recommended max for short_name
    })

    it('should have a start_url', () => {
      expect(manifest.start_url).toBeDefined()
      expect(typeof manifest.start_url).toBe('string')
    })

    it('should have start_url that does not require authentication', () => {
      // start_url should be "/" or a public page, not "/dashboard" which requires auth
      const startUrl = manifest.start_url as string
      expect(startUrl).toBe('/')
    })

    it('should have display mode set to standalone or fullscreen', () => {
      expect(manifest.display).toBeDefined()
      expect(['standalone', 'fullscreen', 'minimal-ui']).toContain(manifest.display)
    })

    it('should have icons array', () => {
      expect(manifest.icons).toBeDefined()
      expect(Array.isArray(manifest.icons)).toBe(true)
      expect((manifest.icons as Array<unknown>).length).toBeGreaterThan(0)
    })
  })

  describe('Icon Requirements', () => {
    it('should have a 192x192 icon', () => {
      const icons = manifest.icons as Array<{ sizes: string; src: string; type: string }>
      const icon192 = icons.find(icon => icon.sizes === '192x192')
      expect(icon192).toBeDefined()
      expect(icon192?.type).toBe('image/png')
    })

    it('should have a 512x512 icon', () => {
      const icons = manifest.icons as Array<{ sizes: string; src: string; type: string }>
      const icon512 = icons.find(icon => icon.sizes === '512x512')
      expect(icon512).toBeDefined()
      expect(icon512?.type).toBe('image/png')
    })

    it('should have maskable icons for Android adaptive icons', () => {
      const icons = manifest.icons as Array<{ sizes: string; purpose?: string }>
      const maskableIcon = icons.find(icon => icon.purpose === 'maskable')
      expect(maskableIcon).toBeDefined()
    })

    it('should have icons with valid paths', () => {
      const icons = manifest.icons as Array<{ src: string }>
      icons.forEach(icon => {
        expect(icon.src).toMatch(/^\//)  // Should start with /
        expect(icon.src).toMatch(/\.png$/)  // Should be PNG
      })
    })

    it('should have icon files that exist', () => {
      const icons = manifest.icons as Array<{ src: string }>
      const publicDir = path.join(process.cwd(), 'public')

      icons.forEach(icon => {
        const iconPath = path.join(publicDir, icon.src)
        expect(fs.existsSync(iconPath)).toBe(true)
      })
    })
  })

  describe('Optional but Recommended Fields', () => {
    it('should have a description', () => {
      expect(manifest.description).toBeDefined()
      expect(typeof manifest.description).toBe('string')
    })

    it('should have theme_color', () => {
      expect(manifest.theme_color).toBeDefined()
      expect(typeof manifest.theme_color).toBe('string')
      expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/)
    })

    it('should have background_color', () => {
      expect(manifest.background_color).toBeDefined()
      expect(typeof manifest.background_color).toBe('string')
      expect(manifest.background_color).toMatch(/^#[0-9a-fA-F]{6}$/)
    })

    it('should have scope defined', () => {
      expect(manifest.scope).toBeDefined()
      expect(manifest.scope).toBe('/')
    })

    it('should not prefer related applications', () => {
      // This should be false to encourage PWA installation
      expect(manifest.prefer_related_applications).toBe(false)
    })
  })

  describe('Shortcuts (Optional)', () => {
    it('should have shortcuts array if defined', () => {
      if (manifest.shortcuts) {
        expect(Array.isArray(manifest.shortcuts)).toBe(true)
      }
    })

    it('should have valid shortcut structure', () => {
      if (manifest.shortcuts) {
        const shortcuts = manifest.shortcuts as Array<{
          name: string
          url: string
          icons?: Array<{ src: string }>
        }>

        shortcuts.forEach(shortcut => {
          expect(shortcut.name).toBeDefined()
          expect(shortcut.url).toBeDefined()
          expect(shortcut.url).toMatch(/^\//)
        })
      }
    })
  })
})
