import { defineConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const testHome = path.resolve('.playwright-yfl-home');
fs.rmSync(testHome, { recursive: true, force: true });
fs.mkdirSync(testHome, { recursive: true });

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:43871',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'node tests/e2e/start-judge.mjs',
    url: 'http://127.0.0.1:43871/health',
    timeout: 30_000,
    reuseExistingServer: false,
    env: {
      YFL_TEST_STATE_DIR: path.join(testHome, 'state'),
    },
  },
});
