import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/integration',
  outputDir: './test-results/integration',
  timeout: 120000,
  workers: 1,
  retries: 0,
  use: {
    baseURL: process.env.PHASE2_INTEGRATION_URL,
    channel: 'chrome',
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  reporter: 'list',
});
