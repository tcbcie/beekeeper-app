# Testing Guide

This document explains how to set up and use the test environment for HiveCraic.

## Overview

HiveCraic uses **Vitest** as the testing framework with the following supporting libraries:

- **@testing-library/react** - For testing React components
- **@testing-library/jest-dom** - For DOM-specific matchers
- **@testing-library/user-event** - For simulating user interactions
- **jsdom** - For DOM environment simulation
- **happy-dom** - Alternative lightweight DOM implementation

## Setup

The test environment is already configured. To get started:

```bash
# Install dependencies (if not already installed)
npm install
```

## Running Tests

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run tests in watch mode |
| `npm run test:ui` | Run tests with Vitest UI (browser-based interface) |
| `npm run test:run` | Run tests once (no watch mode) |
| `npm run test:coverage` | Run tests with coverage report |

### Examples

```bash
# Run all tests in watch mode
npm test

# Run a specific test file
npm test -- tests/components/StatCard.test.tsx

# Run tests matching a pattern
npm test -- --grep "should render"

# Run tests with coverage
npm run test:coverage
```

## Test File Structure

```
tests/
├── setup-simple.ts          # Test setup configuration
├── components/              # Component tests
│   ├── StatCard.test.tsx
│   ├── LoadingSpinner.test.tsx
│   └── HiveConfigurationHistory.test.tsx
├── lib/                     # Utility/helper tests
│   └── auth.test.ts
├── utils/                   # Utility function tests
│   └── date-helpers.test.ts
├── api/                     # API route tests
│   └── admin/
│       └── update-user-role.test.ts
└── integration/             # Integration tests
    └── version-management.test.ts
```

### Naming Conventions

- Test files should be named `*.test.ts` or `*.test.tsx`
- Place tests in the appropriate subdirectory based on what they test:
  - `tests/components/` - React component tests
  - `tests/lib/` - Utility function and library tests
  - `tests/api/` - API route handler tests
  - `tests/integration/` - Integration tests

## Configuration

### vitest.config.mts

The main Vitest configuration:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.test.config.mjs'
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup-simple.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/types.ts',
        'src/app/layout.tsx'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```

### tests/setup-simple.ts

The test setup file that runs before each test:

```typescript
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import { expect } from 'vitest'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Cleanup after each test
afterEach(() => {
  cleanup()
})
```

## Writing Tests

### Component Tests

Example: Testing a React component

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatCard from '@/components/ui/StatCard'

describe('StatCard', () => {
  it('should render the label and value', () => {
    render(
      <StatCard
        label="Total Hives"
        value={42}
        icon="🐝"
        color="text-amber-500"
      />
    )

    expect(screen.getByText('Total Hives')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('should render as a link when href is provided', () => {
    render(
      <StatCard
        label="Apiaries"
        value={5}
        icon="📍"
        color="text-green-500"
        href="/dashboard/apiaries"
      />
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/dashboard/apiaries')
  })
})
```

### Unit Tests with Mocking

Example: Testing a function that uses Supabase

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn()
  }))
}))

describe('Auth Helper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return user when authenticated', async () => {
    // Test implementation
  })
})
```

### API Route Tests

Example: Testing a Next.js API route

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Hoist mock objects for module initialization
const { mockAuth, mockFrom, mockSupabaseClient } = vi.hoisted(() => {
  const mockAuth = {
    getUser: vi.fn()
  }

  const mockFrom = vi.fn()

  const mockSupabaseClient = {
    auth: mockAuth,
    from: mockFrom
  }

  return { mockAuth, mockFrom, mockSupabaseClient }
})

// Mock the Supabase module
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}))

// Import route after mocks are set up
import { POST } from '@/app/api/admin/update-user-role/route'

describe('Update User Role API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when authorization header is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/update-user-role', {
      method: 'POST',
      body: JSON.stringify({ targetUserId: 'user-123', newRole: 'Power User' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Missing authorization header')
  })

  it('should successfully update user role', async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-123', email: 'admin@example.com' } },
      error: null
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { role: 'Admin' },
                error: null
              })
            })
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: [{ id: 'user-456', role: 'Power User' }],
                error: null
              })
            })
          })
        }
      }
      return {}
    })

    const request = new NextRequest('http://localhost:3000/api/admin/update-user-role', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer valid-token' },
      body: JSON.stringify({ targetUserId: 'user-456', newRole: 'Power User' })
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
  })
})
```

## Mocking Patterns

### Mocking Supabase Chains

Supabase uses method chaining. To mock this pattern:

```typescript
const mockFrom = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { id: '123', name: 'Test' },
        error: null
      })
    })
  })
})
```

### Using vi.hoisted for Module Mocks

When mocking modules that need to be available during module initialization:

```typescript
const { mockClient } = vi.hoisted(() => {
  return {
    mockClient: {
      from: vi.fn()
    }
  }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockClient)
}))
```

### Mocking Next.js Features

```typescript
// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn()
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard'
}))
```

## Common Matchers

### DOM Matchers (from @testing-library/jest-dom)

```typescript
expect(element).toBeInTheDocument()
expect(element).toBeVisible()
expect(element).toBeDisabled()
expect(element).toHaveAttribute('href', '/path')
expect(element).toHaveClass('my-class')
expect(element).toHaveTextContent('Hello')
expect(element).toHaveValue('input value')
```

### Standard Vitest Matchers

```typescript
expect(value).toBe(expected)
expect(value).toEqual(expected)
expect(value).toBeTruthy()
expect(value).toBeFalsy()
expect(array).toContain(item)
expect(fn).toHaveBeenCalled()
expect(fn).toHaveBeenCalledWith(arg1, arg2)
```

## Coverage Reports

After running `npm run test:coverage`, reports are generated in:

- **Terminal** - Text summary
- **coverage/** - HTML report (open `coverage/index.html` in browser)
- **coverage/lcov.info** - LCOV format for CI integration

### Coverage Thresholds

The project enforces these minimum coverage thresholds:

- Lines: 80%
- Functions: 80%
- Branches: 75%
- Statements: 80%

## CI/CD Integration

### GitHub Actions Workflows

Two workflows are configured for automated testing:

#### 1. Test Workflow (`.github/workflows/test.yml`)

Runs on every push and pull request to `main` and `develop` branches.

**Features:**
- Runs all tests automatically
- Generates coverage reports
- Uploads coverage to Codecov
- Comments test results on pull requests

#### 2. Coverage Badge Workflow (`.github/workflows/coverage-badge.yml`)

Updates coverage badge on every push to `main`.

**Setup Required:**
1. Create a GitHub Gist for the badge
2. Generate a GitHub Personal Access Token with `gist` scope
3. Add `GIST_SECRET` to repository secrets
4. Update `gistID` in the workflow file

### Codecov Integration

To enable Codecov coverage reporting:

1. Sign up at [codecov.io](https://codecov.io/)
2. Connect your GitHub repository
3. Get your Codecov token
4. Add `CODECOV_TOKEN` to repository secrets

## Best Practices

1. **Test behavior, not implementation** - Focus on what the component does, not how it does it.

2. **Use descriptive test names** - Test names should describe the expected behavior.

3. **Keep tests isolated** - Each test should be independent and not rely on other tests.

4. **Clean up after tests** - The setup file handles cleanup automatically, but be mindful of global state.

5. **Mock external dependencies** - Always mock Supabase, APIs, and other external services.

6. **Use `screen` queries** - Prefer `screen.getByRole`, `screen.getByText`, etc. for better accessibility testing.

7. **Avoid testing implementation details** - Don't test internal state or private methods.

## Troubleshooting

### Tests Not Running

- Make sure all dependencies are installed: `npm install`
- Check that vitest is version 2.x: `npm list vitest`

### PostCSS Errors

The PostCSS configuration uses Tailwind CSS v4 which has compatibility issues with test environments. The test config uses a separate `postcss.test.config.mjs` to handle this.

If you still encounter errors:
```bash
mv postcss.config.mjs postcss.config.mjs.backup
npm run test:run
mv postcss.config.mjs.backup postcss.config.mjs
```

### Module Not Found Errors

- Ensure path alias `@` is configured correctly in `vitest.config.mts`
- Check that the file exists in the `src/` directory

### Mock Not Being Applied

- Make sure `vi.mock()` is at the top level of the test file
- Use `vi.hoisted()` for mocks that need to be available during module initialization
- Call `vi.clearAllMocks()` in `beforeEach`

### TypeScript Errors in Tests

- Ensure `@types/react` and other type packages are installed
- Check that `tsconfig.json` includes the tests directory

## Tools Reference

| Tool | Version | Purpose |
|------|---------|---------|
| vitest | v2.1.9 | Test runner |
| @testing-library/react | v16.3.0 | React testing utilities |
| @testing-library/jest-dom | v6.9.1 | DOM matchers |
| @testing-library/user-event | v14.6.1 | User interaction simulation |
| jsdom | v27.2.0 | DOM environment |
| @vitest/ui | v2.1.9 | Visual test UI |
| @vitejs/plugin-react | v5.1.1 | React support |

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [Vitest API Reference](https://vitest.dev/api/)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
