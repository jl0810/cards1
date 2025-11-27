import { test, expect } from '@playwright/test';

/**
 * Critical User Flow E2E Test
 * Basic smoke tests to verify app loads and navigation works
 */

test.describe('App Smoke Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Verify page loads
    await expect(page).toHaveTitle(/PointMax Velocity/i);
    
    // Check for sign in button (Clerk auth)
    const signInButton = page.locator('text=/Sign In|Log In/i');
    await expect(signInButton).toBeVisible({ timeout: 10000 });
  });

  
  test('API endpoints are accessible', async ({ page }) => {
    // Test that API returns proper auth errors
    const response = await page.request.post('/api/plaid/sync-transactions', {
      data: { itemId: 'test' },
    });
    
    // Should return 401 Unauthorized
    expect(response.status()).toBe(401);
  });

  test('build artifacts exist', async ({ page }) => {
    // Check that static assets load
    await page.goto('/');
    
    // Verify CSS loaded
    const styles = await page.locator('link[rel="stylesheet"]').count();
    expect(styles).toBeGreaterThan(0);
  });
});
