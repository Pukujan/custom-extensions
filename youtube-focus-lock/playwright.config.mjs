import { defineConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const testHome = path.resolve('.playwright-yfl-home');
fs.rmSync(testHome, { recursive: true, force: true });
fs.mkdirSync(testHome, { recursive: true });

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
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
    command: `env HOME=${JSON.stringify(testHome)} PYTHONUNBUFFERED=1 python3 macos/challenge_ui.py serve --mode preview --port 43871`,
    url: 'http://127.0.0.1:43871/health',
    timeout: 20_000,
    reuseExistingServer: false,
  },
});
