# Testing Infrastructure Setup

## Overview

The Beekeeper app now has a complete testing infrastructure set up using Vitest, Testing Library, and related tools.

## Running Tests

### All Tests
```bash
npm test
```
Runs tests in watch mode - automatically reruns when files change.

### Single Run (CI/CD)
```bash
npm run test:run
```
Runs all tests once and exits. Perfect for CI/CD pipelines.

### Visual UI Mode
```bash
npm run test:ui
```
Opens a browser UI for visual test exploration and debugging.

### Coverage Report
```bash
npm run test:coverage
```
Generates a detailed coverage report in `./coverage/`.

## Important Note

**PostCSS Compatibility**: Due to Tailwind CSS v4's PostCSS configuration, you need to temporarily disable the PostCSS config when running tests. This is a known limitation.

**Workaround**: The test scripts handle this automatically, but if you encounter PostCSS errors, you can manually run:

```bash
mv postcss.config.mjs postcss.config.mjs.backup
npm run test:run
mv postcss.config.mjs.backup postcss.config.mjs
```

## Test Structure

```
tests/
├── README.md                          # Detailed testing guide
├── setup-simple.ts                    # Test environment setup
├── simple.test.ts                     # Basic infrastructure test
├── components/                        # Component tests
│   ├── HiveConfigurationHistory.test.tsx
│   └── LoadingSpinner.test.tsx
├── utils/                             # Utility function tests
│   └── date-helpers.test.ts
└── integration/                       # Integration tests
    └── version-management.test.ts
```

## Writing Tests

### Basic Test Example

```typescript
import { describe, it, expect } from 'vitest'

describe('My Feature', () => {
  it('should work correctly', () => {
    expect(1 + 1).toBe(2)
  })
})
```

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

## Coverage Goals

- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

## CI/CD Integration

### GitHub Actions Workflows

Two workflows are configured for automated testing:

#### 1. **Test Workflow** (`.github/workflows/test.yml`)
Runs on every push and pull request to `main` and `develop` branches.

**Features:**
- Runs all tests automatically
- Generates coverage reports
- Uploads coverage to Codecov
- Comments test results on pull requests

#### 2. **Coverage Badge Workflow** (`.github/workflows/coverage-badge.yml`)
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

### Viewing Test Results

- **Pull Requests**: Test results are automatically commented
- **Workflow Runs**: View detailed logs in the Actions tab
- **Coverage**: Check Codecov for detailed coverage reports

## Next Steps

1. **Add More Tests**: Focus on critical user flows (authentication, hive management, inspections)
2. **Increase Coverage**: Aim for 80%+ coverage across the codebase (currently at 0.44%)
3. **Enable Codecov**: Set up Codecov for better coverage visualization
4. **E2E Tests**: Consider adding Playwright for end-to-end testing
5. **Component Tests**: Add more React component tests with user interactions

## Tools Installed

- **vitest**: Fast test runner (v2.1.9)
- **@testing-library/react**: React component testing utilities
- **@testing-library/jest-dom**: DOM matchers for better assertions
- **@testing-library/user-event**: User interaction simulation
- **jsdom**: DOM environment for tests
- **@vitest/ui**: Visual test UI
- **@vitejs/plugin-react**: React support for Vite/Vitest

## Troubleshooting

### Tests Not Running
- Make sure all dependencies are installed: `npm install`
- Check that vitest is version 2.x: `npm list vitest`

### PostCSS Errors
- The PostCSS configuration uses Tailwind CSS v4 which has compatibility issues with test environments
- Use the workaround mentioned above or update `vitest.config.mts` to disable CSS processing

### Module Not Found Errors
- Ensure path alias `@` is configured correctly in `vitest.config.mts`
- Check that the file exists in the `src/` directory

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [Test Examples](./tests/README.md)
