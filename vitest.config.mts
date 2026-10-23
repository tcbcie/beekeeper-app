import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  css: {
    // Inline, not a path. Vite treats a string here as a DIRECTORY to search
    // for a PostCSS config, so './postcss.test.config.mjs' never matched and
    // resolution fell through to the real postcss.config.mjs, whose Tailwind
    // v4 plugin this loader cannot construct - which failed every test file
    // before any of them ran. CSS is disabled for tests below in any case.
    postcss: { plugins: [] }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup-simple.ts'],
    // Page tests type into real inputs; on a busy machine (a full parallel run, CI) 5 s per test
    // is too tight and failures become random. 15 s keeps them reliable.
    testTimeout: 15_000,
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.*',
        '**/types.ts',
        '**/*.d.ts',
        'migrations/',
        '.next/',
        'coverage/',
        '.claude/',
        'public/'
      ],
      // Every file under src/ is reported, tested or not (Vitest 4+ does this from `include`;
      // the old `all` option was removed).
      include: ['src/**/*.{ts,tsx}'],
      // No coverage thresholds yet. The old 80% values sat outside `thresholds`, so they were
      // never applied; real coverage is far lower. Add `thresholds` once CI reports a baseline.
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
