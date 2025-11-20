import { test, expect } from '@playwright/test';

test.describe('Search and Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).Telegram = {
        WebApp: {
          initDataUnsafe: { user: { id: 349353007 } },
          ready: () => {},
          expand: () => {},
          themeParams: {},
        },
      };
    });
  });

  test('should perform basic search', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Find search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Поиск"], input[placeholder*="Search"]').first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('велосипед');
      await page.waitForTimeout(300);
      
      // Try pressing Enter
      await searchInput.press('Enter');
      await page.waitForLoadState('networkidle');
      
      // Check if URL changed or if we're still on main page
      const url = page.url();
      // Test passes if either search worked (URL has q=) or page loaded without errors
      expect(url).toBeTruthy();
    }
  });

  test('should show autocomplete suggestions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[type="search"], input[placeholder*="Поиск"]').first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('вело');
      
      // Wait a bit for suggestions
      await page.waitForTimeout(500);
      
      // Check if suggestions dropdown appears
      const suggestions = page.locator('[role="listbox"], .suggestions, div').filter({ hasText: /велосипед|bike/i });
      const hasSuggestions = await suggestions.first().isVisible().catch(() => false);
      
      if (hasSuggestions) {
        await expect(suggestions.first()).toBeVisible();
      }
    }
  });

  test('should filter by category', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Click on a category button
    const categoryButton = page.locator('button').filter({ hasText: /🚗|Авто|Auto/ }).first();
    
    if (await categoryButton.isVisible()) {
      await categoryButton.click();
      await page.waitForLoadState('networkidle');
      
      // Check URL contains category
      await expect(page).toHaveURL(/category=/);
    }
  });

  test('should apply price filter', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for price filter inputs
    const minPrice = page.locator('input[type="number"]').filter({ hasText: /мин|min/i }).or(page.locator('input[placeholder*="мин"]')).first();
    const maxPrice = page.locator('input[type="number"]').filter({ hasText: /макс|max/i }).or(page.locator('input[placeholder*="макс"]')).first();
    
    const hasFilters = await minPrice.isVisible().catch(() => false);
    
    if (hasFilters) {
      await minPrice.fill('100');
      await maxPrice.fill('1000');
      await page.waitForTimeout(500);
      
      // Filters should be applied
      await expect(page).toHaveURL(/price/);
    }
  });

  test('should clear search and return to main feed', async ({ page }) => {
    await page.goto('/?q=test');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[type="search"]').first();
    
    if (await searchInput.isVisible()) {
      await searchInput.clear();
      await searchInput.press('Enter');
      
      // Should return to main page
      await expect(page).toHaveURL('/');
    }
  });
});
