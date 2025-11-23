# Beekeeper App - Test Suite

This directory contains all unit, integration, and component tests for the Beekeeper application.

## Directory Structure

```
tests/
├── README.md                    # This file
├── setup.ts                     # Test environment setup and mocks
├── components/                  # Component tests
│   ├── HiveConfigurationHistory.test.tsx
│   └── LoadingSpinner.test.tsx
├── utils/                       # Utility function tests
│   └── date-helpers.test.ts
└── integration/                 # Integration tests
    └── version-management.test.ts
```

## Running Tests

### Watch Mode (Development)
```bash
npm run test
```
Runs tests in watch mode - automatically reruns when files change. Great for TDD.

### Visual UI Mode
```bash
npm run test:ui
```
Opens a browser UI at http://localhost:51204/__vitest__/ for visual test exploration and debugging.

### Single Run (CI/CD)
```bash
npm run test:run
```
Runs all tests once and exits. Used in CI/CD pipelines.

### Coverage Report
```bash
npm run test:coverage
```
Generates a detailed coverage report in `./coverage/`. Open `coverage/index.html` to view.

## Writing Tests

### Component Test Example

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MyComponent from '@/components/MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### Async Test with User Interaction

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('Interactive Component', () => {
  it('should handle click events', async () => {
    const user = userEvent.setup()
    render(<Button />)

    const button = screen.getByRole('button')
    await user.click(button)

    expect(screen.getByText('Clicked')).toBeInTheDocument()
  })
})
```

### Mocking Supabase

Supabase is automatically mocked in `tests/setup.ts`. To customize the mock for specific tests:

```typescript
import { vi } from 'vitest'
import { supabase } from '@/lib/supabase'

it('should fetch data from Supabase', async () => {
  const mockData = [{ id: '1', name: 'Test' }]

  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({
        data: mockData,
        error: null
      }))
    }))
  } as any)

  // Your test code here
})
```

## Testing Best Practices

1. **AAA Pattern**: Arrange, Act, Assert
   ```typescript
   it('should do something', () => {
     // Arrange - setup test data
     const input = 'test'

     // Act - perform the action
     const result = myFunction(input)

     // Assert - verify the result
     expect(result).toBe('expected')
   })
   ```

2. **Test User Behavior, Not Implementation**
   ```typescript
   // ❌ Bad - testing implementation
   expect(component.state.isOpen).toBe(true)

   // ✅ Good - testing user-visible behavior
   expect(screen.getByRole('dialog')).toBeVisible()
   ```

3. **Clear Test Descriptions**
   ```typescript
   // ❌ Bad
   it('test 1', () => {})

   // ✅ Good
   it('should display error message when form is invalid', () => {})
   ```

4. **One Assertion Per Test** (when possible)
   ```typescript
   // Better to split into multiple tests
   it('should validate email format', () => {
     expect(isValidEmail('test@example.com')).toBe(true)
   })

   it('should reject invalid email format', () => {
     expect(isValidEmail('invalid')).toBe(false)
   })
   ```

## Coverage Goals

- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

## Troubleshooting

### Tests failing with "Cannot find module"
Make sure the path alias `@` is correctly configured in `vitest.config.ts`:
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src')
  }
}
```

### Supabase mock not working
Check that `tests/setup.ts` is properly loaded. It should be specified in `vitest.config.ts`:
```typescript
test: {
  setupFiles: ['./tests/setup.ts']
}
```

### Component not rendering
Make sure you're using `jsdom` environment in `vitest.config.ts`:
```typescript
test: {
  environment: 'jsdom'
}
```

## Next Steps

1. Add tests for critical user flows (authentication, hive creation, inspections)
2. Increase coverage to 80%+
3. Set up GitHub Actions for CI/CD testing
4. Add visual regression testing with Playwright or Chromatic

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
