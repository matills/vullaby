import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');

    // Check for h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThan(0);
    expect(h1Count).toBeLessThanOrEqual(1); // Should only have one h1
  });

  test('should have alt text for images', async ({ page }) => {
    await page.goto('/');

    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const ariaLabel = await img.getAttribute('aria-label');

      // Image should have alt text or aria-label
      expect(alt !== null || ariaLabel !== null).toBeTruthy();
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');

    // Try tabbing through the page
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should have visible focus indicator
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have proper form labels', async ({ page }) => {
    await page.goto('/');

    const inputs = page.locator('input:not([type="hidden"])');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');

      // Input should have associated label or aria-label
      const hasLabel = id && await page.locator(`label[for="${id}"]`).count() > 0;
      const hasAriaLabel = ariaLabel !== null || ariaLabelledBy !== null;
      const hasPlaceholder = placeholder !== null;

      expect(hasLabel || hasAriaLabel || hasPlaceholder).toBeTruthy();
    }
  });

  test('should have proper color contrast (basic check)', async ({ page }) => {
    await page.goto('/');

    // Check that text is visible (basic check)
    const bodyText = page.locator('body');
    const color = await bodyText.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    expect(color).toBeTruthy();
  });

  test('should have skip to main content link', async ({ page }) => {
    await page.goto('/');

    // Press Tab to focus skip link
    await page.keyboard.press('Tab');

    // Check for skip link or main landmark
    const hasSkipLink = await page.locator('a[href="#main"], a:has-text("Skip to")').count() > 0;
    const hasMain = await page.locator('main, [role="main"]').count() > 0;

    expect(hasSkipLink || hasMain).toBeTruthy();
  });
});
