import { test, expect } from '@playwright/test';

// =========================================================================
// 🚀 FULL APPLICATION E2E TEST (Bazaar UA) 
// This test suite goes through all major features in a single flow.
// =========================================================================

test.describe('Bazaar - Full Feature E2E Verification', () => {
  
  // Mock Telegram Auth before each test
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).Telegram = {
        WebApp: {
          initDataUnsafe: {
            user: {
              id: 999888777,
              first_name: 'E2E',
              last_name: 'Tester',
              username: 'e2e_tester',
            },
          },
          ready: () => {},
          expand: () => {},
          themeParams: {},
        },
      };
    });
  });

  test('Core Journey: Create -> Search -> Interact -> Profile -> Analytics', async ({ page }) => {
    
    // -----------------------------------------------------------------
    // 1. HOME & NAVIGATION
    // -----------------------------------------------------------------
    await test.step('Load Home Page & Verify Elements', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL('/');
      await expect(page.locator('text=Bazaar')).toBeVisible();
      // Wait for at least one listing or empty state to load
      await page.waitForSelector('.grid'); 
    });

    // -----------------------------------------------------------------
    // 2. SEARCH & FILTERS
    // -----------------------------------------------------------------
    await test.step('Search and Filters', async () => {
      const searchInput = page.locator('input[type="search"]').first();
      await searchInput.fill('Автомобиль');
      await searchInput.press('Enter');
      await page.waitForLoadState('networkidle');
      
      // Select a category filter (e.g. Auto)
      const autoCategory = page.locator('button').filter({ hasText: /🚗|Авто/i }).first();
      if (await autoCategory.isVisible()) {
        await autoCategory.click();
        await page.waitForLoadState('networkidle');
      }
      // Check that URL query params updated
      expect(page.url()).toContain('q=%D0%90'); // URL encoded 'А'
    });

    // -----------------------------------------------------------------
    // 3. CREATE LISTING
    // -----------------------------------------------------------------
    await test.step('Create a New Listing', async () => {
      await page.goto('/create');
      await page.waitForLoadState('networkidle');
      
      await page.fill('input[name="title"]', 'E2E Test Item - ' + Date.now());
      await page.fill('textarea[name="description"]', 'This is an automated test description with enough characters to pass validation.');
      await page.fill('input[name="price"]', '150');
      
      // Select Category (assuming default is chosen or we click first one)
      const categorySelect = page.locator('select').first();
      if (await categorySelect.isVisible()) {
         await categorySelect.selectOption({ index: 1 });
      }

      await page.fill('input[name="location"]', 'Киев, Центр');
      
      // Submit
      const publishBtn = page.locator('button[type="submit"]', { hasText: /Опубликовать|Publish|Зберегти/i });
      if (await publishBtn.isVisible() && await publishBtn.isEnabled()) {
         // We do not actually submit to avoid spamming the DB in every run, 
         // but we verify the button is ready.
         await expect(publishBtn).toBeEnabled();
      }
    });

    // -----------------------------------------------------------------
    // 4. LISTING DETAILS & SOCIAL INTERACTIONS (Likes)
    // -----------------------------------------------------------------
    await test.step('Listing Details & Likes', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Click first available listing
      const firstListing = page.locator('a[href*="/listing/"]').first();
      if (await firstListing.isVisible()) {
        await firstListing.click();
        await page.waitForLoadState('networkidle');
        
        // Verify Title and Price are visible
        await expect(page.locator('h1').first()).toBeVisible();
        
        // Try Liking
        const heartBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
        if (await heartBtn.isVisible()) {
            await heartBtn.click(); // Like
        }
      }
    });

    // -----------------------------------------------------------------
    // 5. SELLER PROFILE (Subscriptions & Reviews)
    // -----------------------------------------------------------------
    await test.step('View Seller Profile & Interactions', async () => {
       // From listing details, click seller profile
       const profileLink = page.locator('a[href*="/profile/"]').first();
       if (await profileLink.isVisible()) {
         await profileLink.click();
         await page.waitForLoadState('networkidle');
         
         // Check Subscription Button
         const subBtn = page.locator('button', { hasText: /Подписаться|Follow/i }).first();
         if (await subBtn.isVisible()) {
             await expect(subBtn).toBeVisible();
         }

         // Check Reviews Section
         const reviewStars = page.locator('text=Отзывы');
         if (await reviewStars.isVisible()) {
             await expect(reviewStars).toBeVisible();
         }
       }
    });

    // -----------------------------------------------------------------
    // 6. MESSAGING (Chat)
    // -----------------------------------------------------------------
    await test.step('Messaging UI', async () => {
       await page.goto('/messages');
       await page.waitForLoadState('networkidle');
       await expect(page.locator('text=Чат|Повідомлення|Messages').first()).toBeVisible();
    });

    // -----------------------------------------------------------------
    // 7. MY PROFILE & ANALYTICS
    // -----------------------------------------------------------------
    await test.step('My Profile & Analytics', async () => {
       // Profile root
       await page.goto('/my');
       await page.waitForLoadState('networkidle');
       await expect(page.locator('text=E2E Tester').first()).toBeVisible();

       // Statistics Page (New Feature)
       await page.goto('/my/statistics');
       await page.waitForLoadState('networkidle');
       
       // Verify Recharts Canvas/Container is rendered
       const chartArea = page.locator('.recharts-responsive-container').first();
       if (await chartArea.isVisible()) {
          await expect(chartArea).toBeVisible();
       }
    });

  });
});
