import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/api-mode',
  workers: 1,
  timeout: 30000,
  outputDir: './test-results/api-mode',
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5183',
    channel: 'chrome',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5183 --strictPort',
    url: 'http://127.0.0.1:5183',
    reuseExistingServer: false,
    env: { VITE_PHASE2_MOCK: 'false', VITE_API_BASE_URL: 'http://127.0.0.1:5183' },
  },
});
