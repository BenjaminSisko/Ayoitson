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
    restoreMocks: true,
  },
});
