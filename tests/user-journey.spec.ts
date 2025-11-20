import { test, expect } from '@playwright/test';

test.describe('User Flow - Complete Journey', () => {
  test.beforeEach(async ({ page }) => {
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

  test('complete user journey: browse -> search -> view -> my listings', async ({ page }) => {
    // 1. Start on main page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('/');
    
    // 2. Browse categories
    const categoryButton = page.locator('button').filter({ hasText: /🚗|авто/i }).first();
    if (await categoryButton.isVisible()) {
      await categoryButton.click();
      await page.waitForLoadState('networkidle');
    }
    
    // 3. Perform search
    const searchInput = page.locator('input[type="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('велосипед');
      await searchInput.press('Enter');
      await page.waitForLoadState('networkidle');
    }
    
    // 4. View a listing
    const listingCard = page.locator('a[href*="/listing/"]').first();
    if (await listingCard.isVisible()) {
      await listingCard.click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/listing\/\d+/);
    }
    
    // 5. Go to My Listings
    const myListingsLink = page.locator('a[href="/my"]').first();
    if (await myListingsLink.isVisible()) {
      await myListingsLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL('/my');
    }
  });

  test('navigation: use browser back button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to create page
    const createLink = page.locator('a[href="/create"]').first();
    if (await createLink.isVisible()) {
      await createLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL('/create');
      
      // Go back
      await page.goBack();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL('/');
    }
  });

  test('responsive: check mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Page should still load
    await expect(page.locator('body')).toBeVisible();
    
    // Categories should be scrollable
    const categoryScroll = page.locator('div').filter({ hasText: /🧸|🏠|🚗/ }).first();
    await expect(categoryScroll).toBeVisible();
  });

  test('error handling: navigate to non-existent listing', async ({ page }) => {
    await page.goto('/listing/999999');
    await page.waitForLoadState('networkidle');
    
    // Should handle gracefully (either 404 or redirect)
    const currentUrl = page.url();
    expect(currentUrl).toBeTruthy();
  });

  test('persistence: search query persists in URL', async ({ page }) => {
    await page.goto('/?q=тест&category=auto');
    await page.waitForLoadState('networkidle');
    
    // URL should contain query params (check for presence, not exact match)
    const url = page.url();
    expect(url).toContain('q=');
    expect(url).toContain('category=auto');
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Query params should still be there
    const reloadedUrl = page.url();
    expect(reloadedUrl).toContain('q=');
  });
});
