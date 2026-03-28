import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Emlak CRM E2E tests.
 *
 * Usage:
 *   npx playwright test              # Run all E2E tests
 *   npx playwright test --ui         # Open interactive UI mode
 *   npx playwright test --headed     # Run with browser visible
 *   npx playwright test --debug      # Run in debug mode
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',

  /* Maximum time one test can run */
  timeout: 30000,

  /* Maximum time expect() calls can wait */
  expect: {
    timeout: 10000,
  },

  /* Run tests sequentially in CI, parallel locally */
  fullyParallel: !process.env.CI,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry failed tests in CI */
  retries: process.env.CI ? 2 : 0,

  /* Reporter */
  reporter: process.env.CI ? 'github' : 'html',

  /* Shared settings for all projects */
  use: {
    /* Base URL for the frontend */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    /* Collect trace on failure */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'on-first-retry',

    /* Locale and timezone for Turkish environment */
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
  },

  /* Configure browser projects */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Mobile viewports */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
  ],

  /* Run the dev server before running E2E tests (optional) */
  webServer: process.env.CI
    ? {
        command: 'npm run dev',
        port: 3000,
        timeout: 120000,
        reuseExistingServer: false,
      }
    : {
        command: 'npm run dev',
        port: 3000,
        timeout: 120000,
        reuseExistingServer: true,
      },
});
