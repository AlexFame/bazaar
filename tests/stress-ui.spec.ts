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
});
