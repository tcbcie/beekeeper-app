This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Testing

This project includes a comprehensive testing infrastructure using Vitest and Testing Library.

### Running Tests

```bash
npm test              # Run tests in watch mode
npm run test:ui       # Open visual test UI
npm run test:run      # Run tests once (for CI)
npm run test:coverage # Generate coverage report
```

### Test Coverage

Current test coverage: **1.92%** statements (37.91% in lib/, 38.3% in components/ui/)

**High-Coverage Modules:**
- `lib/auth.ts`: **97.69%** coverage (29 tests)
- `lib/date-utils.ts`: **98.27%** coverage (26 tests)
- `lib/changelog.ts`: **66.24%** coverage (15 tests)
- `components/ui/StatCard.tsx`: **100%** coverage (6 tests)
- `components/ui/RatingButtons.tsx`: **100%** coverage (12 tests)
- `components/ui/LoadingSpinner.tsx`: **100%** coverage (3 tests)

**Summary:**
- ✅ 131 tests passing across 10 test files
- ⏱️ Test execution time: ~18 seconds

### Documentation

- [TESTING.md](TESTING.md) - Comprehensive testing guide
- [tests/README.md](tests/README.md) - Test examples and patterns
- [TEST-SETUP-SUMMARY.md](TEST-SETUP-SUMMARY.md) - Complete setup summary

### CI/CD Integration

Automated testing runs on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

GitHub Actions workflows:
- [test.yml](.github/workflows/test.yml) - Runs tests and generates coverage
- [coverage-badge.yml](.github/workflows/coverage-badge.yml) - Updates coverage badge

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
