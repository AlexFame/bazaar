import { test, expect } from '@playwright/test';

test.describe('Listing Creation', () => {
  test('should create a new listing successfully', async ({ page }) => {
    // Mock Telegram WebApp
    await page.addInitScript(() => {
      window.Telegram = {
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

    // Navigate to create listing page
    await page.goto('/create');

    // Fill in the form
    await page.fill('input[name="title"]', 'Test Listing');
    await page.fill('textarea[name="description"]', 'This is a test listing');
    await page.fill('input[name="price"]', '100');
    await page.fill('input[name="location"]', 'Test City');
    await page.fill('input[name="contacts"]', '@testuser');

    // Select category
    await page.selectOption('select[name="category"]', 'electronics');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect or success message
    await page.waitForURL(/\/listing\/\d+/);

    // Verify listing was created
    await expect(page.locator('h1')).toContainText('Test Listing');
  });

  test('should validate required fields', async ({ page }) => {
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

    await page.goto('/create');

    // Try to submit without filling required fields
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator('text=обязательно')).toBeVisible();
  });
});
