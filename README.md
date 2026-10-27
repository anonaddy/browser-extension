# Anonymous Email Forwarding

This is the source code for the addy.io browser extension.

## Build

```bash
# Install dependencies
npm install

# Generate dev assets
npm run dev

# Generate production assets
npm run production

# Build production zip
npm run build
```

## Test

The tests run the built extension in Chromium with a fake browser extension
API and a fake addy.io API, so no account or network access is needed.

```bash
# Install the test browser (first time only)
npx playwright install chromium

# Build dev assets and run the tests
npm test
```