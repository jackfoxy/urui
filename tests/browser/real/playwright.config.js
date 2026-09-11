'use strict';

const path = require('node:path');
const {defineConfig} = require('@playwright/test');

const {baseConfig} = require('../playwright.base.js');

const externalServer = Boolean(process.env.URUI_URL);
const baseURL = process.env.URUI_URL || 'http://127.0.0.1:4174';

module.exports = defineConfig(baseConfig({
  testDir: __dirname,
  baseURL,
  webServer: externalServer ? undefined : {
    command: 'node ../serve-app.js',
    cwd: __dirname,
    url: `${baseURL}/apps/urui-fixture/`,
    reuseExistingServer: false,
    timeout: 120_000
  }
}));
