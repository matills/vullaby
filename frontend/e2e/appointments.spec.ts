import { test, expect } from '@playwright/test';

// Helper to login
async function login(page: any) {
  if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
    throw new Error('Test credentials not configured');
  }

  await page.goto('/');
  await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL);
  await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 10000 });
}

test.describe('Appointments Management', () => {
  test.beforeEach(async ({ page }) => {
    // Skip tests if credentials not available
    if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
      test.skip();
      return;
    }

    await login(page);
  });

  test('should display appointments list', async ({ page }) => {
    // Navigate to appointments
    await page.click('text=/appointments|turnos/i');

    // Wait for appointments to load
    await page.waitForSelector('[data-testid="appointments-list"], table, .appointment', {
      timeout: 10000,
      state: 'visible'
    });

    // Check that the page loaded
    await expect(page.locator('h1, h2')).toContainText(/appointments|turnos/i);
  });

  test('should open create appointment modal', async ({ page }) => {
    await page.click('text=/appointments|turnos/i');

    // Click create button
    const createButton = page.locator('button:has-text("Create"), button:has-text("Crear"), button:has-text("New")').first();
    await createButton.click();

    // Modal should be visible
    await expect(page.locator('[role="dialog"], .modal')).toBeVisible({ timeout: 5000 });
  });

  test('should validate appointment form fields', async ({ page }) => {
    await page.click('text=/appointments|turnos/i');

    const createButton = page.locator('button:has-text("Create"), button:has-text("Crear"), button:has-text("New")').first();
    await createButton.click();

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Should show validation errors
    await expect(page.locator('text=/required|obligatorio|necesario/i')).toBeVisible({ timeout: 3000 });
  });

  test('should filter appointments by status', async ({ page }) => {
    await page.click('text=/appointments|turnos/i');

    // Wait for appointments to load
    await page.waitForSelector('[data-testid="appointments-list"], table', { timeout: 10000 });

    // Look for filter/status selector
    const statusFilter = page.locator('select, [role="combobox"]').first();

    if (await statusFilter.isVisible()) {
      await statusFilter.click();

      // Select a status
      await page.click('text=/confirmed|pending|cancelled/i');

      // Wait for filtered results
      await page.waitForTimeout(1000);
    }
  });

  test('should search appointments', async ({ page }) => {
    await page.click('text=/appointments|turnos/i');

    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="buscar" i]').first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('test');

      // Wait for search results
      await page.waitForTimeout(1000);
    }
  });
});
