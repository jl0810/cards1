import { test, expect } from '@playwright/test';

/**
 * Plaid Link Integration E2E Test
 * Tests the complete bank linking flow using Plaid Sandbox
 * 
 * @requires User to be signed in (manual step for now)
 * @requires Plaid sandbox credentials in .env
 */

test.describe('Plaid Link Flow', () => {
  // Skip by default - run manually with: npm run test:e2e:headed -- e2e/plaid-link.spec.ts
  test.skip('complete bank linking with Plaid sandbox', async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    
    // For now, we'll test the flow after manual sign-in
    // TODO: Add Clerk test auth when available
    console.log('⚠️  Manual step: Sign in to the app first');
    console.log('   Then this test will verify Plaid Link works');
    
    // Wait for user to sign in manually (or skip if already signed in)
    await page.waitForURL(/dashboard|settings|accounts/, { timeout: 60000 });
    
    console.log('✅ User signed in, proceeding with Plaid test...');
    
    // Find and click the "Connect Bank" or "Link Bank" button
    const connectButton = page.locator('button:has-text("Connect Bank"), button:has-text("Link Bank"), button:has-text("Add Bank")').first();
    await expect(connectButton).toBeVisible({ timeout: 10000 });
    await connectButton.click();
    
    console.log('🔗 Clicked connect bank button');
    
    // Wait for Plaid Link iframe to load
    const plaidFrame = page.frameLocator('iframe[src*="plaid"], iframe[title*="Plaid"]');
    await expect(plaidFrame.locator('body')).toBeVisible({ timeout: 15000 });
    
    console.log('✅ Plaid Link opened');
    
    // Search for and select Chase (sandbox institution)
    const searchBox = plaidFrame.locator('input[type="text"], input[placeholder*="Search"], input[name="search"]').first();
    if (await searchBox.isVisible({ timeout: 5000 })) {
      await searchBox.fill('Chase');
      await page.waitForTimeout(1000);
    }
    
    // Click on Chase
    const chaseButton = plaidFrame.locator('text=Chase, button:has-text("Chase")').first();
    await expect(chaseButton).toBeVisible({ timeout: 10000 });
    await chaseButton.click();
    
    console.log('✅ Selected Chase');
    
    // Enter Plaid sandbox credentials
    // Sandbox credentials: user_good / pass_good
    const usernameInput = plaidFrame.locator('input[name="username"], input[type="text"]').first();
    await expect(usernameInput).toBeVisible({ timeout: 10000 });
    await usernameInput.fill('user_good');
    
    const passwordInput = plaidFrame.locator('input[name="password"], input[type="password"]').first();
    await passwordInput.fill('pass_good');
    
    console.log('✅ Entered credentials');
    
    // Click submit/continue
    const submitButton = plaidFrame.locator('button:has-text("Submit"), button:has-text("Continue"), button[type="submit"]').first();
    await submitButton.click();
    
    console.log('✅ Submitted credentials');
    
    // Wait for account selection screen
    await page.waitForTimeout(2000);
    
    // Select the first account (checking account)
    const accountCheckbox = plaidFrame.locator('input[type="checkbox"]').first();
    if (await accountCheckbox.isVisible({ timeout: 5000 })) {
      await accountCheckbox.check();
      console.log('✅ Selected account');
    }
    
    // Click final continue/connect button
    const finalButton = plaidFrame.locator('button:has-text("Continue"), button:has-text("Connect"), button:has-text("Link")').first();
    await finalButton.click();
    
    console.log('✅ Clicked final connect button');
    
    // Wait for redirect back to app
    await page.waitForTimeout(3000);
    
    // Verify bank card appears on dashboard
    const bankCard = page.locator('text=Chase, [data-testid="bank-card"]:has-text("Chase")');
    await expect(bankCard).toBeVisible({ timeout: 15000 });
    
    console.log('✅ Bank card appeared on dashboard');
    
    // Verify account mask is visible (e.g., "••••1234")
    const accountMask = page.locator('text=/••••\\d{4}/');
    await expect(accountMask).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Account mask visible');
    
    // Verify balance is displayed
    const balance = page.locator('text=/\\$[\\d,]+\\.\\d{2}/');
    await expect(balance).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Balance displayed');
    
    console.log('🎉 Complete Plaid Link flow successful!');
  });

  test.skip('should prevent duplicate bank connections', async ({ page }) => {
    // Navigate to dashboard (assumes user is signed in)
    await page.goto('/');
    await page.waitForURL(/dashboard|settings|accounts/, { timeout: 60000 });
    
    // Count existing Chase connections
    const existingChaseCards = await page.locator('text=Chase').count();
    console.log(`📊 Existing Chase connections: ${existingChaseCards}`);
    
    // Try to connect Chase again
    const connectButton = page.locator('button:has-text("Connect Bank"), button:has-text("Link Bank")').first();
    
    if (await connectButton.isVisible({ timeout: 5000 })) {
      await connectButton.click();
      
      const plaidFrame = page.frameLocator('iframe[src*="plaid"]');
      
      // Try to add Chase again
      const chaseButton = plaidFrame.locator('text=Chase').first();
      if (await chaseButton.isVisible({ timeout: 5000 })) {
        await chaseButton.click();
        
        const usernameInput = plaidFrame.locator('input[name="username"]').first();
        if (await usernameInput.isVisible({ timeout: 5000 })) {
          await usernameInput.fill('user_good');
          await plaidFrame.locator('input[name="password"]').fill('pass_good');
          await plaidFrame.locator('button:has-text("Submit")').click();
          
          await page.waitForTimeout(2000);
          
          const accountCheckbox = plaidFrame.locator('input[type="checkbox"]').first();
          if (await accountCheckbox.isVisible({ timeout: 5000 })) {
            await accountCheckbox.check();
            await plaidFrame.locator('button:has-text("Continue")').click();
          }
        }
      }
      
      await page.waitForTimeout(3000);
    }
    
    // Verify no duplicate was created
    const finalChaseCards = await page.locator('text=Chase').count();
    console.log(`📊 Final Chase connections: ${finalChaseCards}`);
    
    // Should be same count (duplicate prevented)
    expect(finalChaseCards).toBe(existingChaseCards);
    
    console.log('✅ Duplicate prevention working!');
  });
});
