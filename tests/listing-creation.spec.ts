import { test, expect } from '@playwright/test';

test.describe('Create Listing Page', () => {
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

  test('should load create listing page', async ({ page }) => {
    await page.goto('/create');
    await page.waitForLoadState('networkidle');
    
    // Check that form is visible
    await expect(page.locator('h1')).toBeVisible();
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
