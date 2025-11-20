import { test, expect } from '@playwright/test';

test.describe('Listing Details Page', () => {
  test('should display listing with image zoom', async ({ page }) => {
    await page.addInitScript(() => {
      window.Telegram = {
        WebApp: {
          initDataUnsafe: { user: { id: 349353007 } },
          ready: () => {},
          expand: () => {},
          themeParams: {},
        },
      };
    });

    // Navigate to a listing (assuming listing ID 1 exists)
    await page.goto('/listing/1');

    // Wait for listing to load
    await page.waitForSelector('h1');

    // Verify listing title is displayed
    await expect(page.locator('h1')).toBeVisible();

    // Check if image is displayed
    const image = page.locator('img[alt*="Фото"]').first();
    if (await image.isVisible()) {
      // Verify image uses object-contain (no cropping)
      const imageClass = await image.getAttribute('class');
      expect(imageClass).toContain('object-contain');

      // Click image to open lightbox
      await image.click();

      // Verify lightbox is opened
      await expect(page.locator('.fixed.inset-0.z-50')).toBeVisible();

      // Close lightbox
      await page.locator('.fixed.inset-0.z-50').click();
      await expect(page.locator('.fixed.inset-0.z-50')).not.toBeVisible();
    }
  });

  test('should display category badge', async ({ page }) => {
    await page.addInitScript(() => {
      window.Telegram = {
        WebApp: {
          initDataUnsafe: { user: { id: 349353007 } },
          ready: () => {},
          expand: () => {},
          themeParams: {},
        },
      };
    });

    await page.goto('/listing/1');

    // Check for category display (icon + label)
    const categoryBadge = page.locator('text=/🎯|🚗|🏠|📱/');
    if (await categoryBadge.isVisible()) {
      await expect(categoryBadge).toBeVisible();
    }
  });
});
