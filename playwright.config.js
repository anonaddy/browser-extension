const { defineConfig } = require('@playwright/test')

// Tests run the built extension (npm run dev first, or npm test) in ordinary
// pages with a fake extension API and a fake addy.io API. See tests/fixtures.js.
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'list',
  use: {
    browserName: 'chromium',
    // The popup's own size, set in app.css
    viewport: { width: 400, height: 600 },
    trace: 'retain-on-failure',
  },
})
