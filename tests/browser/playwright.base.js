'use strict';

// Shared Playwright settings for every urui consumer.
//
// The pinned locale, timezone, color scheme, and single worker are not
// preferences: Ace's key bindings and the shell's theme both depend on
// them, so an unpinned run reports platform differences as failures.

const {devices} = require('@playwright/test');

const baseConfig = ({testDir, baseURL, webServer}) => ({
  testDir,
  testMatch: '*.spec.js',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: 'line',
  metadata: {
    acePlatform: 'win',
    keyboardLayout: 'en-US'
  },
  webServer,
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    locale: 'en-US',
    timezoneId: 'UTC',
    colorScheme: 'light',
    trace: 'off',
    screenshot: 'off',
    video: 'off'
  },
  projects: [{
    name: 'chromium-linux-win-keys',
    use: {browserName: 'chromium'}
  }]
});

module.exports = {baseConfig};
