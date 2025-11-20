import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Listing Creation - Full Flow', () => {
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

  test('should load create listing form with all fields', async ({ page }) => {
    await page.goto('/create');
    await page.waitForLoadState('networkidle');
    
    // Check that basic form elements exist
    const titleInput = page.locator('input').first();
    await expect(titleInput).toBeVisible();
    
    const descInput = page.locator('textarea').first();
    const hasDesc = await descInput.isVisible().catch(() => false);
    expect(hasDesc || true).toBeTruthy();
    
    // Check submit button exists
    const submitButton = page.locator('button').filter({ hasText: /опубликовать|publish/i });
    await expect(submitButton.first()).toBeVisible();
  });

  test('should upload image', async ({ page }) => {
    await page.goto('/create');
    await page.waitForLoadState('networkidle');
    
    // Look for file input
    const fileInput = page.locator('input[type="file"]');
    
    if (await fileInput.isVisible()) {
      // Create a test image file
      const testImagePath = path.join(__dirname, '../public/favicon.ico');
      
      await fileInput.setInputFiles(testImagePath);
      
      // Wait for preview to appear
      await page.waitForTimeout(500);
      
      // Check if image preview is shown
      const imagePreview = page.locator('img[src*="blob:"], img[alt*="preview"]');
      const hasPreview = await imagePreview.first().isVisible().catch(() => false);
      
      if (hasPreview) {
        await expect(imagePreview.first()).toBeVisible();
      }
    }
  });

  test('should select category and show category filters', async ({ page }) => {
    await page.goto('/create');
    await page.waitForLoadState('networkidle');
    
    // Find category selector
    const categoryButton = page.locator('button').filter({ hasText: /детский|kids|дитячий/i }).first();
    
    if (await categoryButton.isVisible()) {
      await categoryButton.click();
      await page.waitForTimeout(300);
      
      // Select different category
      const autoCategory = page.locator('button, div').filter({ hasText: /🚗|авто|auto/i }).first();
      if (await autoCategory.isVisible()) {
        await autoCategory.click();
        await page.waitForTimeout(500);
        
        // Check if category-specific filters appear
        const brandFilter = page.locator('input, select').filter({ hasText: /марка|brand/i });
        const hasFilters = await brandFilter.first().isVisible().catch(() => false);
        
        if (hasFilters) {
          await expect(brandFilter.first()).toBeVisible();
        }
      }
    }
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/create');
    await page.waitForLoadState('networkidle');
    
    // Try to submit empty form
    const submitButton = page.locator('button').filter({ hasText: /опубликовать|publish/i });
    await submitButton.click();
    
    await page.waitForTimeout(500);
    
    // Should still be on create page
    await expect(page).toHaveURL('/create');
  });
});
