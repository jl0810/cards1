import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    // Setup project - runs first to create authenticated session
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    // Smoke tests - no auth needed
    {
      name: 'smoke',
      testMatch: /critical-user-flow\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // Authenticated tests - use cached session
    {
      name: 'authenticated',
      testMatch: /auth-and-plaid\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
