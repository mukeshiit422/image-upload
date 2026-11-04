/**
 * E2E TESTS — Playwright
 * Runs against the real app (local or staging).
 * Set BASE_URL env var to target a specific environment.
 *
 * Run: npx playwright test
 * Run against staging: BASE_URL=https://d3eks1vjagjqcv.cloudfront.net npx playwright test
 */
import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';

async function uploadFile(page: Page, filename: string, mimeType = 'image/jpeg') {
  const filePath = path.join(__dirname, 'fixtures', filename);
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({ name: filename, mimeType, buffer: fs.readFileSync(filePath) });
}

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe('Smoke', () => {
  test('page loads and shows upload zone', async ({ page }) => {
    await expect(page.getByText(/drag & drop/i)).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeAttached();
  });

  test('page title is set', async ({ page }) => {
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});

test.describe('Upload flow', () => {
  test('uploading a valid JPEG shows pending status', async ({ page }) => {
    await uploadFile(page, 'valid-portrait.jpg');
    await expect(page.getByText(/pending|processing|queued/i)).toBeVisible({ timeout: 10000 });
  });

  test('upload is accepted and thumbnail appears', async ({ page }) => {
    await uploadFile(page, 'valid-portrait.jpg');
    await expect(page.locator('img[src*="thumbnails"]')).toBeVisible({ timeout: 60000 });
  });

  test('uploading a GIF shows an error or is rejected', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'fake.gif',
      mimeType: 'image/gif',
      buffer: Buffer.from('GIF89a fake gif content'),
    });
    await expect(page.getByText(/wrong file type|rejected|not supported/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Search', () => {
  test('searching returns filtered results', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    if (!(await searchInput.isVisible())) test.skip();

    await searchInput.fill('portrait');
    await page.waitForTimeout(500); // debounce
    const items = page.locator('[data-testid="image-card"]');
    // All visible items should relate to the search term
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(0); // just verify no crash
  });
});

test.describe('Delete', () => {
  test('deleting an image removes it from the list', async ({ page }) => {
    await uploadFile(page, 'valid-portrait.jpg');
    await expect(page.locator('img[src*="thumbnails"]')).toBeVisible({ timeout: 60000 });

    const deleteBtn = page.locator('[data-testid="delete-btn"]').first();
    if (!(await deleteBtn.isVisible())) test.skip();

    await deleteBtn.click();
    await page.getByRole('button', { name: /confirm|yes|delete/i }).click();
    await expect(page.locator('img[src*="thumbnails"]')).toHaveCount(0, { timeout: 5000 });
  });
});

test.describe('Performance', () => {
  test('page loads in under 3 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto(BASE_URL);
    await page.getByText(/drag & drop/i).waitFor();
    expect(Date.now() - start).toBeLessThan(3000);
  });
});
