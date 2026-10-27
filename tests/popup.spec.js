import {
  test,
  expect,
  openPopup,
  signedIn,
  alias,
  email,
  storage,
  addyLog,
  TOKEN,
} from './fixtures.js'

const row = (page, a) => page.getByText(a.local_part, { exact: true })

/** Hold the alias list response until release() is called */
function holdAliasList(api) {
  const respond = api.handlers.get('GET /api/v1/aliases')
  let release
  const released = new Promise((resolve) => (release = resolve))
  api.on('GET /api/v1/aliases', async (...args) => {
    await released
    return respond(...args)
  })
  return release
}

test.describe('storage', () => {
  test('copies account data from sync storage once and leaves the sync copy', async ({
    page,
    api,
  }) => {
    const a = alias()
    api.aliases = [a]
    // As a version before 3.2.0 stored it
    const { migratedFromSync, ...legacy } = signedIn()
    const sync = { ...legacy, theme: 'dark', defaultAliasSort: 'email' }
    await openPopup(page, { sync })

    await expect(row(page, a)).toBeVisible()
    expect(await storage(page, 'local')).toMatchObject({
      apiToken: TOKEN,
      instance: signedIn().instance,
      domain: 'addy.io',
      migratedFromSync: true,
    })
    // Browsers on the account that have not updated yet still read these
    expect(await storage(page, 'sync')).toEqual(sync)

    const listRequest = api.requests.find((r) => r.path === '/api/v1/aliases')
    expect(listRequest.url.searchParams.get('sort')).toBe('-email')
    expect(listRequest.authorization).toBe(`Bearer ${TOKEN}`)
  })

  test('a logged-out device does not copy the old sync key again', async ({ page, api }) => {
    const { migratedFromSync, ...legacy } = signedIn()
    await openPopup(page, { local: { migratedFromSync: true }, sync: legacy })

    await expect(page.locator('#login_username')).toBeVisible()
    expect((await storage(page, 'local')).apiToken).toBeUndefined()
  })

  test('opening the popup does not write settings back to storage', async ({ page, api }) => {
    const a = alias()
    api.aliases = [a]
    await openPopup(page, { local: signedIn(), sync: { theme: 'dark', defaultAliasSort: 'email' } })

    await expect(row(page, a)).toBeVisible()
    await expect.poll(async () => (await addyLog(page)).writes).toEqual(['local:cachedAliases'])
  })
})

test.describe('saved alias list', () => {
  test('shows the saved list at once and swaps in the fresh one', async ({ page, api }) => {
    const saved = alias({ local_part: 'saved' })
    const fresh = alias({ local_part: 'fresh' })
    api.aliases = [fresh]
    const release = holdAliasList(api)

    await openPopup(page, {
      local: signedIn({
        cachedAliases: {
          key: 'https://app.addy.io|all|-created_at',
          data: [saved],
          meta: { total: 1 },
          hasNextPage: false,
        },
      }),
    })

    await expect(row(page, saved)).toBeVisible()
    await expect(page.locator('.aliases-loader')).toHaveCount(0)

    release()
    await expect(row(page, fresh)).toBeVisible()
    await expect(row(page, saved)).toHaveCount(0)
    await expect
      .poll(async () => (await storage(page, 'local')).cachedAliases.data.map((a) => a.local_part))
      .toEqual(['fresh'])
  })

  test('ignores a saved list made with other filters', async ({ page, api }) => {
    const saved = alias({ local_part: 'saved' })
    api.aliases = [alias({ local_part: 'fresh' })]
    const release = holdAliasList(api)

    await openPopup(page, {
      local: signedIn({
        cachedAliases: { key: 'https://app.addy.io|all|-email', data: [saved], meta: {} },
      }),
    })

    await expect(page.locator('.aliases-loader')).toBeVisible()
    await expect(row(page, saved)).toHaveCount(0)
    release()
  })

  test('is cleared on logout', async ({ page, api }) => {
    api.aliases = [alias()]
    await openPopup(page, { local: signedIn() })
    await expect.poll(async () => Boolean((await storage(page, 'local')).cachedAliases)).toBe(true)

    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('button', { name: 'Logout' }).first().click()
    await page.getByRole('button', { name: 'Logout' }).last().click()

    await expect(page.locator('#login_username')).toBeVisible()
    expect(await storage(page, 'local')).toEqual({ migratedFromSync: true })
  })
})

test('a newer search replaces a slower one still loading', async ({ page, api }) => {
  const slow = alias({ local_part: 'slow-result' })
  const fast = alias({ local_part: 'fast-result' })
  api.aliases = [alias()]
  const respond = api.handlers.get('GET /api/v1/aliases')
  api.on('GET /api/v1/aliases', async (route, url, body) => {
    const search = url.searchParams.get('filter[search]')
    if (search === 'slow') {
      await new Promise((r) => setTimeout(r, 1500))
      // The popup has aborted this request by now
      return route
        .fulfill({ json: { data: [slow], meta: { total: 1 }, links: {} } })
        .catch(() => {})
    }
    if (search === 'fast') {
      return route.fulfill({ json: { data: [fast], meta: { total: 1 }, links: {} } })
    }
    return respond(route, url, body)
  })

  await openPopup(page, { local: signedIn() })
  await page.locator('#search').fill('slow')
  await page.waitForTimeout(500)
  await page.locator('#search').fill('fast')

  await expect(row(page, fast)).toBeVisible()
  await page.waitForTimeout(1500)
  await expect(row(page, slow)).toHaveCount(0)
  await expect(page.getByText('Search Results (1 match)')).toBeVisible()
  await expect(page.locator('.aliases-loader')).toHaveCount(0)
})

test('an expired key logs out but keeps preferences', async ({ page, api }) => {
  const a = alias()
  api.aliases = [a]
  api.on('DELETE /api/v1/active-aliases/:id', (route) => route.fulfill({ status: 401, json: {} }))
  await openPopup(page, { local: signedIn(), sync: { theme: 'dark', defaultAliasSort: 'email' } })

  await row(page, a).click()
  await page.getByRole('button', { name: 'Deactivate this alias' }).click()

  await expect(page.locator('#login_username')).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('expired or been revoked')
  expect(await storage(page, 'sync')).toEqual({ theme: 'dark', defaultAliasSort: 'email' })
  expect(await storage(page, 'local')).toEqual({ migratedFromSync: true })
})

test("logging out leaves synced preferences alone for the user's other browsers", async ({
  page,
  api,
}) => {
  api.aliases = [alias()]
  const sync = { theme: 'dark', defaultAliasSort: 'email', showIconInEmailFields: false }
  await openPopup(page, { local: signedIn(), sync })

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Logout' }).first().click()
  await page.getByRole('button', { name: 'Logout' }).last().click()

  await expect(page.locator('#login_username')).toBeVisible()
  expect(await storage(page, 'sync')).toEqual(sync)
})

test('a renewed key does not keep the old sign-in expiry date', async ({ page, api }) => {
  api.aliases = [alias()]
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  await openPopup(page, {
    local: signedIn({ apiTokenFromLogin: true, apiTokenExpiresAt: future }),
  })

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Renew API Key' }).first().click()
  await page.locator('#api_token').fill('d'.repeat(44))
  await page.getByRole('button', { name: 'Renew API Key' }).last().click()

  await expect(page.getByText('Renewed API Key successfully')).toBeVisible()
  const local = await storage(page, 'local')
  expect(local).toMatchObject({ apiToken: 'd'.repeat(44), apiTokenFromLogin: false })
  expect(local.apiTokenExpiresAt).toBeUndefined()
})

test.describe('sign in and logout', () => {
  test('a password sign-in key is deleted on the server at logout', async ({ page, api }) => {
    const loginKey = 'b'.repeat(44)
    api.aliases = [alias()]
    api.on('POST /api/auth/login', (route) =>
      route.fulfill({ status: 422, json: { message: 'MFA required', mfa_key: 'mfa-1' } })
    )
    api.on('POST /api/auth/mfa', (route) => route.fulfill({ json: { api_key: loginKey } }))
    api.on('POST /api/auth/logout', (route) => route.fulfill({ status: 204, body: '' }))

    await openPopup(page)
    await page.locator('#login_username').fill('someone')
    await page.locator('#login_password').fill('secret')
    await page.getByRole('button', { name: 'Sign In' }).click()

    const otp = page.locator('input[autocomplete="one-time-code"]')
    await expect(otp).toBeFocused()
    await otp.fill('123456')
    await otp.press('Enter')

    await expect(page.locator('#search')).toBeVisible()
    expect(api.requests.find((r) => r.path === '/api/auth/mfa').body).toMatchObject({
      mfa_key: 'mfa-1',
      otp: '123456',
    })
    expect(await storage(page, 'local')).toMatchObject({
      apiToken: loginKey,
      apiTokenFromLogin: true,
    })

    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('button', { name: 'Logout' }).first().click()
    await expect(page.getByText('will delete the API key')).toBeVisible()
    await page.getByRole('button', { name: 'Logout' }).last().click()

    await expect(page.locator('#login_username')).toBeVisible()
    const logout = api.requests.filter((r) => r.path === '/api/auth/logout')
    expect(logout).toHaveLength(1)
    expect(logout[0].authorization).toBe(`Bearer ${loginKey}`)
  })

  test('a pasted API key is not deleted at logout', async ({ page, api }) => {
    api.aliases = [alias()]
    await openPopup(page)
    await page.getByText('Login using API Key instead').click()
    await page.locator('#api_token').fill('c'.repeat(44))
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page.locator('#search')).toBeVisible()

    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('button', { name: 'Logout' }).first().click()
    await expect(page.getByText('will not remove the API key')).toBeVisible()
    await page.getByRole('button', { name: 'Logout' }).last().click()

    // The login screen stays on the API key form the user last used
    await expect(page.locator('#api_token')).toBeVisible()
    expect(await storage(page, 'local')).toEqual({ migratedFromSync: true })
    expect(api.requests.filter((r) => r.path === '/api/auth/logout')).toHaveLength(0)
  })
})

test('a toast does not cover the tab bar', async ({ page, api }) => {
  const a = alias()
  api.aliases = [a]
  await openPopup(page, { local: signedIn() })

  // Copying shows a "Copied to clipboard" toast at the bottom
  await row(page, a).click()
  await page.getByText(email(a)).first().click()
  await expect(page.getByText('Copied to clipboard')).toBeVisible()

  const topElement = await page.evaluate(() => {
    const tab = document.querySelector('button[title="Settings"]').getBoundingClientRect()
    const hit = document.elementFromPoint(tab.x + tab.width / 2, tab.y + tab.height / 2)
    return hit.closest('button[title="Settings"]') ? 'Settings tab' : hit.className
  })
  expect(topElement).toBe('Settings tab')
})

test('an error is scrolled into view, even when it repeats', async ({ page, api }) => {
  const inactive = alias({ active: false })
  api.aliases = [inactive]
  await openPopup(page, { local: signedIn() })

  await row(page, inactive).click()
  const content = page.locator('content')
  const banner = page.getByRole('alert')
  const sendFrom = page.getByRole('button', { name: 'Send from this alias' })

  for (let attempt = 0; attempt < 2; attempt++) {
    await content.evaluate((el) => (el.scrollTop = el.scrollHeight))
    if (attempt > 0) await expect(banner).not.toBeInViewport()
    await sendFrom.click()
    await expect(banner).toHaveText('You must activate this alias first')
    await expect(banner).toBeInViewport()
  }
})

test.describe("this site's alias on the Create Alias tab", () => {
  test('can be deactivated and the change undone', async ({ page, api }) => {
    const site = alias({ description: 'github.com' })
    api.aliases = [site]
    await openPopup(page, { local: signedIn(), tabUrl: 'https://github.com/settings' })

    await page.getByRole('button', { name: 'Create Alias' }).click()
    await expect(page.getByText('An alias already exists for this site.')).toBeVisible()
    await expect(page.getByRole('button', { name: email(site) })).toBeVisible()

    await page.getByRole('button', { name: 'Deactivate', exact: true }).click()
    await expect(
      page.getByText('Deactivated. Emails sent to this alias will be discarded.')
    ).toBeVisible()
    expect(
      api.requests.some(
        (r) => r.method === 'DELETE' && r.path === `/api/v1/active-aliases/${site.id}`
      )
    ).toBe(true)

    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByRole('button', { name: 'Deactivate', exact: true })).toBeVisible()
    expect(
      api.requests.some(
        (r) => r.method === 'POST' && r.path === '/api/v1/active-aliases' && r.body.id === site.id
      )
    ).toBe(true)
  })

  test('deactivating it updates the alias list and the saved list', async ({ page, api }) => {
    const site = alias({ description: 'github.com' })
    api.aliases = [site]
    await openPopup(page, { local: signedIn(), tabUrl: 'https://github.com/settings' })
    await expect(page.locator('[title="Active"]')).toHaveCount(1)

    await page.getByRole('button', { name: 'Create Alias' }).click()
    await page.getByRole('button', { name: 'Deactivate', exact: true }).click()
    await expect(page.getByText('Deactivated.', { exact: false })).toBeVisible()

    await page.getByRole('button', { name: 'Aliases' }).click()
    await expect(page.locator('[title="Inactive"]')).toHaveCount(1)
    await expect(page.locator('[title="Active"]')).toHaveCount(0)

    // The next popup open shows the saved list first, so it must not say active
    await expect
      .poll(async () => (await storage(page, 'local')).cachedAliases.data[0].active)
      .toBe(false)
  })

  test('is not offered when the site has no alias', async ({ page, api }) => {
    api.aliases = [alias({ description: 'example.com' })]
    await openPopup(page, { local: signedIn(), tabUrl: 'https://github.com/settings' })

    await page.getByRole('button', { name: 'Create Alias' }).click()
    await expect(page.getByText('Create A New Alias')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Deactivate', exact: true })).toHaveCount(0)
  })
})
