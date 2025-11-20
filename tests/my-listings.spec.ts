import { test, expect } from '@playwright/test';

test.describe('My Listings Page', () => {
  test('should display user listings', async ({ page }) => {
    // Mock Telegram WebApp with test user
    await page.addInitScript(() => {
      window.Telegram = {
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

    // Navigate to My Listings page
    await page.goto('/my');

    // Check for Telegram profile display
    await expect(page.locator('text=Telegram-профиль')).toBeVisible();
    await expect(page.locator('text=Test User')).toBeVisible();

    // Check for listings or empty state
    const hasListings = await page.locator('[data-testid="listing-card"]').count() > 0;
    
    if (hasListings) {
      // Verify listings are displayed
      await expect(page.locator('[data-testid="listing-card"]').first()).toBeVisible();
    } else {
      // Verify empty state
      await expect(page.locator('text=У вас пока нет объявлений')).toBeVisible();
    }
  });

  test('should show correct Telegram ID in console logs', async ({ page }) => {
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.text().includes('[My Listings]')) {
        consoleLogs.push(msg.text());
      }
    });

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

    await page.goto('/my');
    await page.waitForTimeout(2000);

    // Verify correct Telegram ID is logged
    const tgIdLog = consoleLogs.find(log => log.includes('Telegram User ID'));
    expect(tgIdLog).toContain('349353007');
  });
});
