import { test, expect } from '@playwright/test';

test.describe('Telegram WebApp Environment Stress', () => {

  test('Theme & Viewport Thrashing', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page.locator('header')).toBeVisible({ timeout: 10000 });

    // 1. Theme Thrashing
    console.log('--- Theme Toggle Stress ---');
    const html = page.locator('html');
    for (let i = 0; i < 20; i++) {
        // Toggle dark class rapidly
        await page.evaluate(() => {
            document.documentElement.classList.toggle('dark');
        });
        // Tiny delay to allow React to react (or not)
        await page.waitForTimeout(50);
    }
    // Ensure we are stable (e.g., search bar didn't disappear)
    await expect(page.locator('header input')).toBeVisible();

    // 2. Viewport Thrashing (Keyboard Simulation)
    console.log('--- Viewport Resize Stress ---');
    const normalHeight = 800;
    const keyboardHeight = 400; // Keyboard opens
    
    for (let i = 0; i < 10; i++) {
        await page.setViewportSize({ width: 390, height: keyboardHeight });
        await page.waitForTimeout(100);
        await page.setViewportSize({ width: 390, height: normalHeight });
        await page.waitForTimeout(100);
    }
    
    // Check if layout is broken (e.g. bottom nav should be visible or hidden depending on logic)
    // Check if layout is broken (e.g. bottom nav should be visible or hidden depending on logic)
    // Here we just ensure app is alive
    await expect(page.locator('header')).toBeVisible({ timeout: 10000 });
  });

  test('Language Switch Stress', async ({ page }) => {
     await page.goto('http://localhost:3000');
     
     console.log('--- Language Toggle Stress ---');
     // Simulate changing cookie and reloading or internal state change
     // Since we don't have a UI button readily available in snippet, we simulate cookie spam
     
     for (let i = 0; i < 5; i++) {
         const lang = i % 2 === 0 ? 'en' : 'ru';
         await page.context().addCookies([{
             name: 'NEXT_LOCALE',
             value: lang,
             domain: 'localhost',
             path: '/'
         }]);
         // In a real app we might reload or call a function, here we just verify the app doesn't crash on cookie updates
         // In a real app we might reload or call a function, here we just verify the app doesn't crash on cookie updates
         await page.reload({ waitUntil: 'domcontentloaded' });
         // Just check header is there, main content might take time to fetch
         await expect(page.locator('header')).toBeVisible({ timeout: 10000 });
     }
  });

});
