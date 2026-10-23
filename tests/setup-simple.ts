import { afterEach } from 'vitest'
import { cleanup, configure } from '@testing-library/react'
// Adds the jest-dom matchers (toBeInTheDocument, ...) to Vitest's expect, and their types
import '@testing-library/jest-dom/vitest'

// findBy/waitFor wait 1 s by default, which a busy machine (full parallel run, CI) can exceed.
configure({ asyncUtilTimeout: 3000 })

// Cleanup after each test
afterEach(() => {
  cleanup()
})
