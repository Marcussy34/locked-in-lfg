import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./__tests__/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'e2e'],
    css: false,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: [
        'stores/**/*.ts',
        'services/**/*.ts',
        'hooks/**/*.ts',
        'components/**/*.tsx',
      ],
      exclude: ['**/*.test.*', '__tests__/**', 'types/**'],
    },
  },
});
