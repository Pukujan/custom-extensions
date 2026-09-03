import { test, expect, chromium } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const bravePath = process.env.BRAVE_PATH || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';

test('real Brave popup sees the preview judge and opens it', async () => {
  test.skip(process.platform !== 'darwin', 'This acceptance test is intentionally macOS-only.');
  expect(fs.existsSync(bravePath), `Brave executable missing at ${bravePath}`).toBeTruthy();

  const extensionPath = path.resolve('.');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'yfl-brave-playwright-'));
  const context = await chromium.launchPersistentContext(profile, {
    headless: false,
    executablePath: bravePath,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  try {
    let worker = context.serviceWorkers()[0];
    if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 15_000 });
    const match = worker.url().match(/^chrome-extension:\/\/([^/]+)\//);
    expect(match, `Could not derive extension ID from ${worker.url()}`).toBeTruthy();
    const extensionId = match[1];

    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/status.html`);
    await expect(popup.locator('#judge')).toContainText('Coding judge: READY', { timeout: 10_000 });
    await expect(popup.locator('#judge')).toContainText('preview');
    await expect(popup.locator('#judge')).toContainText('120-problem pool');
    await expect(popup.locator('#challenge')).toBeEnabled();
    await expect(popup.locator('#challenge')).toHaveText('Test coding challenge');
    await popup.screenshot({ path: 'test-results/brave-popup-ready.png' });

    const newPage = context.waitForEvent('page');
    await popup.locator('#challenge').click();
    const challenge = await newPage;
    await challenge.waitForLoadState('domcontentloaded');
    await expect(challenge).toHaveURL(/^http:\/\/127\.0\.0\.1:43871\//);
    await expect(challenge.getByText('Python maintenance challenge')).toBeVisible();
    await challenge.screenshot({ path: 'test-results/brave-challenge-opened.png', fullPage: true });
  } finally {
    await context.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
});
