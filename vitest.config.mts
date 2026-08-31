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
      include: ['src/**/*.{ts,tsx}'],
      all: true,
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
