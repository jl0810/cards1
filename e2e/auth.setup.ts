import { test as setup, expect } from '@playwright/test';

/**
 * Auth Setup - Creates authenticated session and caches it
 * This runs once before all tests that need authentication
 */

const AUTH_FILE = 'playwright/.auth/user.json';

setup('authenticate and save session', async ({ page }) => {
  // Use existing test account to avoid CAPTCHA on signup
  const testEmail = 'jeffllawson+testuser@gmail.com';
  const testPassword = 'TestPassword123!';
  
  console.log(`🔐 Signing in with test account: ${testEmail}`);
  
  // Navigate to sign-in page
  await page.goto('/sign-in');
  
  await page.waitForTimeout(2000);
  
  // Fill in email
  await page.locator('input[name="identifier"]').fill(testEmail);
  
  // Click Continue
  await page.locator('button:has-text("Continue")').click();
  
  await page.waitForTimeout(2000);
  
  // Fill in password
  await page.locator('input[name="password"]').fill(testPassword);
  
  // Click Continue to sign in
  await page.locator('button:has-text("Continue")').click();
  
  // Check if email verification is required
  await page.waitForTimeout(2000);
  const verificationInput = page.locator('input[name="code"]');
  if (await verificationInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('⚠️  Email verification required - waiting 30 seconds for manual code entry...');
    await page.waitForTimeout(30000);
  }
  
  // Wait for redirect to dashboard
  await page.waitForURL(/dashboard/, { timeout: 20000 });
  
  console.log('✅ Authenticated! Saving session...');
  
  // Save authenticated state
  await page.context().storageState({ path: AUTH_FILE });
  
  console.log(`💾 Session saved to ${AUTH_FILE}`);
});
