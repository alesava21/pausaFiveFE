import { defineConfig, devices } from 'playwright/test';

export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  workers: 1,
  reporter: [['list'], ['junit', { outputFile: 'test-results/e2e.xml' }]],
  use: {
    baseURL: 'http://127.0.0.1:4307',
    // Mock guest/CSRF values only. No real cookie/session traces in artifacts.
    trace: 'off',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'node tools/serve-e2e.mjs',
    url: 'http://127.0.0.1:4307/sudoku-del-giorno',
    reuseExistingServer: false,
  },
});
