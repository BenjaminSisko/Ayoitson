import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.js'],
    exclude: ['tests/e2e/**'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/**', 'tests/**', 'configs/**', 'web/**'],
      thresholds: {
        lines: 60,
        statements: 60,
        'src/api/**': {
          lines: 75,
          statements: 75,
        },
      },
    },
  },
});
