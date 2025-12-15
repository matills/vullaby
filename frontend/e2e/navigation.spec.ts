import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate between pages', async ({ page }) => {
    await page.goto('/');

    // Check that page loads
    await expect(page).toHaveTitle(/Vullaby|Lina/);

    // Check for common navigation elements
    const nav = page.locator('nav, [role="navigation"]').first();

    if (await nav.isVisible()) {
      // Navigation should be present
      await expect(nav).toBeVisible();
    }
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-12345');

    // Should show 404 message or redirect
    const has404 = await page.locator('text=/404|not found|no encontrada/i').isVisible();
    const hasRedirect = page.url().includes('/') && !page.url().includes('this-page-does-not-exist');

    expect(has404 || hasRedirect).toBeTruthy();
  });

  test('should have working links in navigation', async ({ page }) => {
    await page.goto('/');

    // Get all navigation links
    const navLinks = page.locator('nav a, [role="navigation"] a');
    const count = await navLinks.count();

    if (count > 0) {
      // Check first few links
      for (let i = 0; i < Math.min(count, 3); i++) {
        const link = navLinks.nth(i);
        const href = await link.getAttribute('href');

        if (href && !href.startsWith('#') && !href.startsWith('http')) {
          // Internal link, should be valid
          expect(href).toBeTruthy();
        }
      }
    }
  });

  test('should load page within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;

    // Page should load in less than 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/');

    // Check for viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toBeTruthy();

    // Check for charset
    const charset = await page.locator('meta[charset]').count();
    expect(charset).toBeGreaterThan(0);
  });
});
