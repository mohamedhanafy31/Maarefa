import { defineConfig, devices } from '@playwright/test';

/**
 * 320 is in the set because part of this audience is on Android devices that
 * narrow, and PLAN.md's original 380/768/1440 would have missed them.
 *
 * colorScheme is pinned explicitly on every project. Headless Chromium
 * defaults to light, so an unpinned run silently never exercises the dark
 * default — which is exactly how the first review render came out light while
 * claiming to be dark.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:4321',
    trace: 'on-first-retry',
  },

  // Screenshots are compared at a strict threshold: this suite exists to catch
  // RTL and font regressions, and a loose threshold would let a broken subset
  // through — which is the failure it is here to prevent.
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled' },
  },

  projects: [
    {
      name: '320-dark',
      use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 900 }, colorScheme: 'dark' },
    },
    {
      name: '380-dark',
      use: { ...devices['Desktop Chrome'], viewport: { width: 380, height: 900 }, colorScheme: 'dark' },
    },
    {
      name: '380-light',
      use: { ...devices['Desktop Chrome'], viewport: { width: 380, height: 900 }, colorScheme: 'light' },
    },
    {
      name: '768-dark',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 }, colorScheme: 'dark' },
    },
    {
      name: '1440-dark',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, colorScheme: 'dark' },
    },
  ],

  webServer: {
    command: 'pnpm preview --port 4321',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
