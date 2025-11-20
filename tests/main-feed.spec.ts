import { test, expect } from '@playwright/test';

test.describe('Main Feed', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Telegram WebApp
    await page.addInitScript(() => {
      (window as any).Telegram = {
        WebApp: {
          initDataUnsafe: {
            user: {
              id: 349353007,
              first_name: 'Test',
              last_name: 'User',
            },
          },
          ready: () => {},
          expand: () => {},
          themeParams: {},
        },
      };
    });
  });

  test('should load main page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that page loaded
    await expect(page).toHaveURL('/');
  });

  test('should display category scroll', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for category buttons
    const categories = page.locator('button').filter({ hasText: /🧸|🏠|🚗/ });
    await expect(categories.first()).toBeVisible();
  });

  test('should navigate to create listing page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Find and click create listing link
    const createLink = page.locator('a[href="/create"]').first();
    if (await createLink.isVisible()) {
      await createLink.click();
      await expect(page).toHaveURL('/create');
    }
  });
});
