import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: '.',
    pool: 'forks',
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.mjs'],
          testTimeout: 10_000,
          setupFiles: ['tests/setup/env.mjs'],
        },
      },
      {
        test: {
          name: 'api',
          include: ['tests/integration/api/**/*.test.mjs'],
          testTimeout: 30_000,
          setupFiles: ['tests/setup/env.mjs'],
          globalSetup: ['tests/setup/globalSetup.mjs'],
        },
      },
    ],
  },
});
