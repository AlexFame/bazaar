import { test, expect } from '@playwright/test';

test.describe('UI Stress Test', () => {
  // 1. Rapid Interaction Stress
  test('Search Rapid Toggle & Monkey Input', async ({ page }) => {
    // Navigate to home
    await page.goto('http://localhost:3000');
    
    // Locate Search Input in Header
    const searchInput = page.locator('header input[type="text"]');
    await expect(searchInput).toBeVisible();

    // A. Rapid Open/Close Loop (Stress Testing State Updates)
    console.log('--- Starting Rapid Toggle Stress ---');
    for (let i = 0; i < 5; i++) {
        await searchInput.click();
        // Wait for Cancel button to appear (it toggles via CSS class 'block')
        const cancelButton = page.locator('button', { hasText: 'Отмена' }); 
        await expect(cancelButton).toBeVisible();
        await cancelButton.click();
        await expect(cancelButton).not.toBeVisible();
    }

    // B. Monkey Typing (Valid Input)
    console.log('--- Starting Monkey Typing (Valid) ---');
    await searchInput.click();
    await searchInput.type('iphone', { delay: 10 }); 
    const suggestions = page.locator('text=Предложения');
    await expect(suggestions).toBeVisible({ timeout: 5000 });

    // C. Monkey Typing (Empty State)
    console.log('--- Starting Monkey Typing (Empty) ---');
    await searchInput.fill(''); // Clear
    await searchInput.type('somerandomtextthatdoesnotexist123', { delay: 10 });
    const nothingFound = page.locator('text=Ничего не найдено');
    await expect(nothingFound).toBeVisible({ timeout: 5000 });
    

  });

  // 2. Pagination/Scroll Stress
  test('Feed Infinite Scroll Stress', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    console.log('--- Starting Scroll Stress ---');
    // Scroll down 5 times to trigger load more
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000); 
    }
    
    // Ensure we have more than initial 10 items (assuming 10 per page)
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    expect(scrollHeight).toBeGreaterThan(2000); // Arbitrary large height check
  });

  // 3. Filter Spam Stress
  test('Filter Spam Stress', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    console.log('--- Starting Filter Spam ---');
    // Categories are likely buttons with specific text or generic class
    // We'll target a few known ones based on categories.js
    const categories = ['Детский мир', 'Транспорт', 'Недвижимость', 'Электроника']; // Russian labels usually default
    
    // Locate the scroll container or just find by text
    // Note: They might be inside the new "Stories" circles or list. 
    // We'll just try to click by text.
    
    for (let i = 0; i < 3; i++) { // Loop a few times through the list
        for (const cat of categories) {
             const btn = page.locator(`button:has-text("${cat}")`).first();
             // Check if visible before clicking (horizontal scroll might hide them)
             if (await btn.isVisible()) {
                 await btn.click();
                 // Don't wait for full load, just spam next click
                 await page.waitForTimeout(100); 
             }
        }
    }
    
    // Ensure app is still alive
    await expect(page.locator('header')).toBeVisible({ timeout: 10000 });
  });
});
