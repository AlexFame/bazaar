import { test, expect } from '@playwright/test';

test.describe('Create Listing Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Telegram WebApp
    await page.addInitScript(() => {
      (window as any).Telegram = {
        WebApp: {
          initData: "query_id=AAF...&user=%7B%22id%22%3A349353007%2C%22first_name%22%3A%22Test%22%2C%22last_name%22%3A%22User%22%2C%22username%22%3A%22testuser%22%7D&auth_date=1710927163&hash=...",
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
          platform: 'android' // Mimic real platform
        },
      };
    });
  });

  test('should load create listing page', async ({ page }) => {
    await page.goto('/create');
    await page.waitForLoadState('networkidle');
    
    // Check that form is visible
    // Check that form is visible (targeting inputs which are more critical than H1)
    await expect(page.locator('input[placeholder*="Название"], input[type="text"]')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/create/);
  });

  test('should display category selector', async ({ page }) => {
    await page.goto('/create');
    await page.waitForLoadState('networkidle');
    
    // Check for category dropdown/buttons
    const categorySelector = page.locator('button, select').filter({ hasText: /Детский|Kids|Дитячий/ }).first();
    await expect(categorySelector).toBeVisible();
  });

  test('should have submit button', async ({ page }) => {
    await page.goto('/create');
    await page.waitForLoadState('networkidle');
    
    // Check for submit button
    const submitButton = page.locator('button').filter({ hasText: /Опубликовать|Publish|Опублікувати/ });
    await expect(submitButton.first()).toBeVisible();
  });
});
