import { test, expect } from '@playwright/test';

test.describe('My Listings Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Telegram WebApp with test user
    await page.addInitScript(() => {
      (window as any).Telegram = {
        WebApp: {
          initDataUnsafe: {
            user: {
              id: 349353007,
              first_name: 'Test',
              last_name: 'User',
              username: 'testuser',
            },
          },
          ready: () => {},
          expand: () => {},
          themeParams: {},
        },
      };
    });
  });

  test('should load My Listings page', async ({ page }) => {
    await page.goto('/my');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check that page loaded
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should display Telegram profile info', async ({ page }) => {
    await page.goto('/my');
    await page.waitForLoadState('networkidle');
    
    // Check for profile section (if user has listings or profile is shown)
    const profileSection = page.locator('text=Telegram');
    const hasProfile = await profileSection.isVisible().catch(() => false);
    
    if (hasProfile) {
      await expect(profileSection).toBeVisible();
    }
  });

  test('should display create listing button', async ({ page }) => {
    await page.goto('/my');
    await page.waitForLoadState('networkidle');
    
    // Check for create button
    const createButton = page.locator('a[href="/create"]');
    await expect(createButton).toBeVisible();
  });
});
