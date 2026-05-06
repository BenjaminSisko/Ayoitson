import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'web/src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.js', 'web/src/**/*.test.tsx'],
    exclude: ['tests/e2e/**'],
    setupFiles: ['tests/setup/register-ts.cjs'],
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
