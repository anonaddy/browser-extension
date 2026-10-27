import { test, expect, openSignupPage, signedIn, alias, email, addyLog } from './fixtures.js'

// The background and content scripts run together on https://github.com/signup.

const PICKER = '.addy-io-extension-picker'

/** Centre of the icon on a field, found from the page's light DOM or a shadow root */
async function iconCentre(page, fieldId) {
  return page.evaluate((id) => {
    const field =
      document.getElementById(id) || document.getElementById('host').shadowRoot.getElementById(id)
    const rect = field._addyWrapper.getBoundingClientRect()
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
  }, fieldId)
}

async function clickIcon(page, fieldId = 'email') {
  const { x, y } = await iconCentre(page, fieldId)
  await page.mouse.click(x, y)
}

/**
 * Labels of the options on the page. The picker's shadow root is closed, so
 * they are read from Chromium's accessibility tree, as a screen reader would.
 */
async function pickerOptions(page) {
  const client = await page.context().newCDPSession(page)
  const { nodes } = await client.send('Accessibility.getFullAXTree')
  await client.detach()
  return nodes.filter((n) => !n.ignored && n.role?.value === 'option').map((n) => n.name?.value)
}

const fieldValue = (page, id = 'email') => page.locator(`#${id}`).inputValue()
const aliasPosts = (api) =>
  api.requests.filter((r) => r.method === 'POST' && r.path === '/api/v1/aliases')

test('adds the icon to fields in the page, a shadow root, a dialog and later fields', async ({
  page,
  api,
}) => {
  await openSignupPage(page)

  const hasIcon = (selector) =>
    page.evaluate((s) => {
      const field =
        document.querySelector(s) || document.getElementById('host').shadowRoot.querySelector(s)
      return Boolean(field && field._addyWrapper)
    }, selector)

  expect(await hasIcon('#email')).toBe(true)
  await expect.poll(() => hasIcon('#shadow-email')).toBe(true)

  await page.evaluate(() => document.getElementById('dialog').showModal())
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(document.querySelector('#dialog .addy-io-extension-wrapper')))
    )
    .toBe(true)
  await page.evaluate(() => document.getElementById('dialog').close())

  await page.evaluate(() => {
    const input = document.createElement('input')
    input.id = 'late-email'
    input.type = 'email'
    document.getElementById('later').appendChild(input)
  })
  await expect.poll(() => hasIcon('#late-email')).toBe(true)
})

test('reports a missing alias domain instead of failing silently', async ({ page, api }) => {
  await openSignupPage(page, { local: signedIn({ domain: '' }) })
  await clickIcon(page)

  await expect
    .poll(async () => (await addyLog(page)).notifications)
    .toEqual(['Not logged in or missing settings. Open the addy.io extension to sign in.'])
  expect(await fieldValue(page)).toBe('')
  expect(aliasPosts(api)).toHaveLength(0)
})

test('ignores clicks made by page scripts', async ({ page, api }) => {
  api.aliases = [alias({ description: 'github.com' })]
  await openSignupPage(page)

  await page.evaluate(() => document.querySelector('.addy-io-extension-icon').click())
  await page.waitForTimeout(300)

  expect((await addyLog(page)).sentMessages).not.toContain('FIND_ALIASES_FOR_INPUT')
  expect(await fieldValue(page)).toBe('')
  await expect(page.locator(PICKER)).toHaveCount(0)
})

test('creates and fills an alias when the site has none', async ({ page, api }) => {
  await openSignupPage(page)
  await clickIcon(page)

  await expect.poll(() => fieldValue(page)).toBe('new1@addy.io')
  // Filled through the native setter, so React-style value tracking sees it
  expect(await page.evaluate(() => window.__reactChanges)).toEqual(['new1@addy.io'])
  expect(aliasPosts(api)[0].body).toMatchObject({ description: 'github.com' })
  await expect(page.locator(PICKER)).toHaveCount(0)
})

test.describe('picker', () => {
  const newest = alias({ description: 'github.com' })
  const lookalike = alias({ description: 'notes about github.com' })
  // Made with the "domain" custom local part option, so it has no description
  const older = alias({ local_part: 'github.com' })

  test("lists only this site's aliases and fills the one picked", async ({ page, api }) => {
    api.aliases = [newest, lookalike, older]
    await openSignupPage(page)
    await clickIcon(page)

    await expect(page.locator(PICKER)).toBeVisible()
    expect(await pickerOptions(page)).toEqual([email(newest), email(older), 'Create new alias'])

    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')

    await expect.poll(() => fieldValue(page)).toBe(email(older))
    await expect(page.locator(PICKER)).toHaveCount(0)
    expect(aliasPosts(api)).toHaveLength(0)
  })

  test('shows a description only when it says more than the site name', async ({ page, api }) => {
    const work = alias({ description: 'github.com work account' })
    const www = alias({ description: 'www.github.com' })
    api.aliases = [work, newest, www]
    await openSignupPage(page)
    await clickIcon(page)

    await expect(page.locator(PICKER)).toBeVisible()
    expect(await pickerOptions(page)).toEqual([
      `${email(work)}, github.com work account`,
      email(newest),
      email(www),
      'Create new alias',
    ])

    // Picking the row with a description still fills just the address
    await page.keyboard.press('Enter')
    await expect.poll(() => fieldValue(page)).toBe(email(work))
  })

  test('"Create new alias" makes a new alias even though some exist', async ({ page, api }) => {
    api.aliases = [newest]
    await openSignupPage(page)
    await clickIcon(page)
    await expect(page.locator(PICKER)).toBeVisible()

    // The last row of the list
    const box = await page.locator(PICKER).boundingBox()
    await page.mouse.click(box.x + 40, box.y + box.height - 15)

    await expect.poll(() => fieldValue(page)).toBe('new1@addy.io')
    expect(aliasPosts(api)).toHaveLength(1)
  })

  test('opens from the keyboard and Escape returns focus to the field', async ({ page, api }) => {
    api.aliases = [newest]
    await openSignupPage(page)

    await page.evaluate(() => document.getElementById('email')._addyWrapper.firstChild.focus())
    await page.keyboard.press('Enter')
    await expect(page.locator(PICKER)).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.locator(PICKER)).toHaveCount(0)
    await expect(page.locator('#email')).toBeFocused()
    expect(await fieldValue(page)).toBe('')
  })

  test('closes when the icon is clicked again or the page is clicked', async ({ page, api }) => {
    api.aliases = [newest]
    await openSignupPage(page)

    await clickIcon(page)
    await expect(page.locator(PICKER)).toBeVisible()
    await clickIcon(page)
    await expect(page.locator(PICKER)).toHaveCount(0)

    await clickIcon(page)
    await expect(page.locator(PICKER)).toBeVisible()
    await page.mouse.click(350, 20)
    await expect(page.locator(PICKER)).toHaveCount(0)
    expect(await fieldValue(page)).toBe('')
  })

  test('remembers an alias just created on this page', async ({ page, api }) => {
    await openSignupPage(page)
    await clickIcon(page)
    await expect.poll(() => fieldValue(page)).toBe('new1@addy.io')

    // New aliases can take a moment to appear in search, so hide it there
    api.aliases = []
    await clickIcon(page, 'shadow-email')
    await expect(page.locator(PICKER)).toBeVisible()
    expect(await pickerOptions(page)).toEqual(['new1@addy.io', 'Create new alias'])
  })

  test('is skipped when alias reuse is turned off', async ({ page, api }) => {
    api.aliases = [newest]
    await openSignupPage(page, {
      local: signedIn(),
      sync: { reuseExistingAlias: false },
    })
    await clickIcon(page)

    await expect.poll(() => fieldValue(page)).toBe('new1@addy.io')
    await expect(page.locator(PICKER)).toHaveCount(0)
  })
})

test('turning the icon off and on brings it back in a shadow root', async ({ page, api }) => {
  await openSignupPage(page)
  const shadowHasIcon = () =>
    page.evaluate(() =>
      Boolean(
        document.getElementById('host').shadowRoot.getElementById('shadow-email')._addyWrapper
      )
    )
  await expect.poll(shadowHasIcon).toBe(true)

  await page.evaluate(() => window.browser.storage.sync.set({ showIconInEmailFields: false }))
  await expect(page.locator('.addy-io-extension-wrapper')).toHaveCount(0)

  await page.evaluate(() => window.browser.storage.sync.set({ showIconInEmailFields: true }))
  await expect.poll(shadowHasIcon).toBe(true)
})

test('the shortcut copies the newest site alias in the top frame only', async ({ page, api }) => {
  const site = alias({ description: 'github.com' })
  api.aliases = [site]
  await openSignupPage(page)

  await page.evaluate(() =>
    window.browser.commands.onCommand._listeners.forEach((l) => l('create_and_copy_alias'))
  )

  await expect.poll(async () => (await addyLog(page)).tabMessages.length).toBe(1)
  const { tabMessages, notifications } = await addyLog(page)
  expect(tabMessages[0]).toMatchObject({
    message: { type: 'COPY_TO_CLIPBOARD', text: email(site) },
    options: { frameId: 0 },
  })
  await expect
    .poll(async () => (await addyLog(page)).notifications)
    .toEqual([`Existing alias copied: ${email(site)}`])
  expect(aliasPosts(api)).toHaveLength(0)
})
