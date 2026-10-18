import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/phase2/**/*.test.{js,jsx}'],
    setupFiles: ['./tests/phase2/setup.js'],
    restoreMocks: true,
    pool: 'forks',
    maxWorkers: 1,
    fileParallelism: false,
  },
});
