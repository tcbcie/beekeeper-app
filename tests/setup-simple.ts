import { afterEach } from 'vitest'
import { cleanup, configure } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import { expect } from 'vitest'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// findBy/waitFor wait 1 s by default, which a busy machine (full parallel run, CI) can exceed.
configure({ asyncUtilTimeout: 3000 })

// Cleanup after each test
afterEach(() => {
  cleanup()
})
