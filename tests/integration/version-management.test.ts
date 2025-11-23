import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Version Management Integration', () => {
  const rootDir = join(process.cwd())
  const versionFile = join(rootDir, 'version.json')

  it('should have a valid version.json file', () => {
    const content = readFileSync(versionFile, 'utf-8')
    const versionData = JSON.parse(content)

    expect(versionData).toHaveProperty('version')
    expect(versionData).toHaveProperty('date')
    expect(versionData.version).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('should have consistent version format', () => {
    const content = readFileSync(versionFile, 'utf-8')
    const versionData = JSON.parse(content)

    // Version should follow semver (e.g., 1.2.3)
    expect(versionData.version).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('should have a valid date format', () => {
    const content = readFileSync(versionFile, 'utf-8')
    const versionData = JSON.parse(content)

    // Date should be in format "Month DD, YYYY" (e.g., "November 23, 2025")
    expect(versionData.date).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/)
  })

  it('should maintain version consistency across key files', () => {
    const versionJsonContent = readFileSync(versionFile, 'utf-8')
    const versionData = JSON.parse(versionJsonContent)
    const version = versionData.version

    // Check login page
    const loginPage = readFileSync(join(rootDir, 'src/app/login/page.tsx'), 'utf-8')
    expect(loginPage).toContain(`v${version}`)

    // Check dashboard page
    const dashboardPage = readFileSync(join(rootDir, 'src/app/dashboard/page.tsx'), 'utf-8')
    expect(dashboardPage).toContain(`v${version}`)

    // Check about page
    const aboutPage = readFileSync(join(rootDir, 'src/app/dashboard/about/page.tsx'), 'utf-8')
    expect(aboutPage).toContain(version)
  })
})
