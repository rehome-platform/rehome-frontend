import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.js',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5182',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: ['chrome', 'msedge'].flatMap((channel) =>
    [1440, 1280, 768].map((width) => ({
      name: `${channel}-${width}`,
      use: { channel, viewport: { width, height: 1000 } },
    })),
  ),
  webServer: {
    command: 'npm.cmd run dev -- --host 127.0.0.1 --port 5182 --strictPort',
    url: 'http://127.0.0.1:5182',
    reuseExistingServer: false,
    env: { VITE_PHASE2_MOCK: 'true', VITE_API_BASE_URL: 'http://127.0.0.1:5182' },
  },
});
