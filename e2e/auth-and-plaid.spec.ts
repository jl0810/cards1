import { test, expect } from '@playwright/test';

/**
 * Full User Flow: Auth + Plaid Link
 * Tests complete Plaid Link flow using cached authenticated session
 * 
 * @requires auth.setup.ts to run first (creates cached session)
 * @requires Plaid sandbox credentials
 */

test.describe('Complete User Flow: Auth → Link Bank', () => {
  test('link bank account with Plaid sandbox', async ({ page }) => {
    console.log('🔐 Using cached authenticated session...');
    
    // Step 1: Navigate to dashboard (already authenticated via storageState)
    await page.goto('/dashboard');
    console.log('✅ Authenticated! Starting Plaid test...');
    
    // Step 2: Find and click "Connect Bank" button
    const connectButton = page.locator('button:has-text("Connect Bank"), button:has-text("Link Bank"), button:has-text("Add Bank")').first();
    await expect(connectButton).toBeVisible({ timeout: 10000 });
    await connectButton.click();
    console.log('🔗 Clicked Connect Bank');
    
    // Step 10: Wait for Plaid Link iframe
    const plaidFrame = page.frameLocator('iframe[src*="plaid"], iframe[title*="Plaid"]');
    await expect(plaidFrame.locator('body')).toBeVisible({ timeout: 15000 });
    console.log('✅ Plaid Link opened');
    
    // Step 11: Search for Chase (optional)
    await page.waitForTimeout(1000);
    const searchBox = plaidFrame.locator('input[type="text"]').first();
    if (await searchBox.isVisible({ timeout: 3000 })) {
      await searchBox.fill('Chase');
      await page.waitForTimeout(500);
    }
    
    // Step 12: Click Chase
    const chaseButton = plaidFrame.locator('text=Chase, button:has-text("Chase")').first();
    await expect(chaseButton).toBeVisible({ timeout: 10000 });
    await chaseButton.click();
    console.log('✅ Selected Chase');
    
    // Step 13: Enter Plaid sandbox credentials
    const usernameInput = plaidFrame.locator('input[name="username"], input[type="text"]').first();
    await expect(usernameInput).toBeVisible({ timeout: 10000 });
    await usernameInput.fill('user_good');
    
    const plaidPasswordInput = plaidFrame.locator('input[name="password"], input[type="password"]').first();
    await plaidPasswordInput.fill('pass_good');
    console.log('✅ Entered Plaid sandbox credentials');
    
    // Step 14: Submit
    const plaidSubmitButton = plaidFrame.locator('button:has-text("Submit"), button:has-text("Continue"), button[type="submit"]').first();
    await plaidSubmitButton.click();
    console.log('✅ Submitted credentials');
    
    // Step 15: Wait for account selection
    await page.waitForTimeout(2000);
    
    // Step 16: Select first account
    const accountCheckbox = plaidFrame.locator('input[type="checkbox"]').first();
    if (await accountCheckbox.isVisible({ timeout: 5000 })) {
      await accountCheckbox.check();
      console.log('✅ Selected account');
      
      // Click final continue
      const finalButton = plaidFrame.locator('button:has-text("Continue"), button:has-text("Connect")').first();
      await finalButton.click();
      console.log('✅ Clicked final connect');
    }
    
    // Step 17: Wait for redirect back to app
    await page.waitForTimeout(3000);
    
    // Step 18: Verify bank card appears
    const bankCard = page.locator('text=Chase, [data-testid*="bank"], [data-testid*="card"]:has-text("Chase")');
    await expect(bankCard).toBeVisible({ timeout: 15000 });
    console.log('✅ Bank card appeared!');
    
    // Step 19: Verify account details
    const accountMask = page.locator('text=/••••\\d{4}/');
    await expect(accountMask).toBeVisible({ timeout: 5000 });
    console.log('✅ Account mask visible');
    
    // Step 20: Verify balance
    const balance = page.locator('text=/\\$[\\d,]+\\.\\d{2}/');
    await expect(balance).toBeVisible({ timeout: 5000 });
    console.log('✅ Balance displayed');
    
    console.log('🎉 COMPLETE FLOW SUCCESSFUL: Login → Link Bank → Verify!');
  });

});
