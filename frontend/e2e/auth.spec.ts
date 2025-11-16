import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await expect(page).toHaveTitle(/Vullaby|Lina/);

    // Check for login elements
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for error message
    await expect(page.locator('text=/error|invalid|incorrect/i')).toBeVisible({ timeout: 5000 });
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    // Skip if no test credentials are available
    if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
      test.skip();
      return;
    }

    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL);
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD);

    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
  });

  test('should have responsive navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile viewport

    // Check for mobile menu
    const mobileMenuButton = page.locator('button[aria-label*="menu" i], button:has-text("Menu")').first();
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();

      // Menu should be visible
      await expect(page.locator('nav, [role="navigation"]')).toBeVisible();
    }
  });
});
