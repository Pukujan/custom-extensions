import { test, expect } from '@playwright/test';

async function state(page) {
  return page.evaluate(async () => {
    const token = document.querySelector('meta[name="yfl-token"]').content;
    const r = await fetch('/api/state', { headers: { 'X-YFL-Token': token } });
    if (!r.ok) throw new Error(`state HTTP ${r.status}`);
    return r.json();
  });
}

test('preview judge renders a balanced five-problem session', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Python maintenance challenge')).toBeVisible();
  await expect(page.locator('#modeBadge')).toHaveText('Preview / burn-in');
  await expect(page.locator('#bankSize')).toHaveText('120-problem pool');
  await expect(page.locator('#problemNav button')).toHaveCount(5);

  const s = await state(page);
  expect(s.mode).toBe('preview');
  expect(s.bankSize).toBe(120);
  expect(new Set(s.problems.map((p) => p.family)).size).toBe(5);
  expect(s.problems.filter((p) => p.difficulty === 'Medium')).toHaveLength(3);
  expect(s.problems.filter((p) => p.difficulty === 'Hard')).toHaveLength(2);

  await page.screenshot({ path: 'test-results/judge-initial.png', fullPage: true });
});

test('compile error is classified and includes a useful hint', async ({ page }) => {
  await page.goto('/');
  await page.locator('#code').fill('def broken(:\n    pass\n');
  await page.getByRole('button', { name: 'Compile & Run' }).click();
  await expect(page.locator('#resultTitle')).toHaveText('Compile error');
  await expect(page.locator('#result')).toContainText('Line');
  await expect(page.locator('#hintBox')).toBeVisible();
  await expect(page.locator('#hintBox')).not.toHaveText('');
  await page.screenshot({ path: 'test-results/judge-compile-error.png', fullPage: true });
});

test('autosaved code survives page close/reopen and expiration does not extend', async ({ context, page }) => {
  await page.goto('/');
  const before = await state(page);
  const marker = `# persistence-${Date.now()}\ndef candidate(*args):\n    return None\n`;
  await page.locator('#code').fill(marker);
  await expect(page.locator('#saveState')).toHaveText('Saved on disk', { timeout: 5_000 });
  const afterSave = await state(page);
  expect(afterSave.expiresAt).toBe(before.expiresAt);

  await page.close();
  const reopened = await context.newPage();
  await reopened.goto('/');
  await expect(reopened.locator('#code')).toHaveValue(marker);
  const afterReopen = await state(reopened);
  expect(afterReopen.expiresAt).toBe(before.expiresAt);
});

test('manual hint is progressive and does not reveal hidden input', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Hint' }).click();
  await expect(page.locator('#hintBox')).toContainText('Hint 1/');
  const first = await page.locator('#hintBox').textContent();
  await page.getByRole('button', { name: 'Hint' }).click();
  await expect(page.locator('#hintBox')).not.toHaveText(first);
  const second = await page.locator('#hintBox').textContent();
  expect(second).not.toBe(first);
  expect(second).not.toMatch(/hidden input|test case:\s*\[/i);
});

test('preview UI never exposes maintenance or uninstall controls', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#lockedActions')).toBeHidden();
  const result = await page.evaluate(async () => {
    const token = document.querySelector('meta[name="yfl-token"]').content;
    const r = await fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-YFL-Token': token },
      body: JSON.stringify({ action: 'uninstall' }),
    });
    return { status: r.status, body: await r.json() };
  });
  expect(result.status).toBe(409);
  expect(result.body.error).toMatch(/Preview challenges cannot/i);
});
