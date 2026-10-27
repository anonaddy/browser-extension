import { test as base, expect } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '..')
const EXT_ORIGIN = 'https://ext.test'
export const API = 'https://app.addy.io'
export const POPUP_URL = `${EXT_ORIGIN}/tests/harness/popup.html`
export const SIGNUP_URL = 'https://github.com/signup'

const CONTENT_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}
// Only the build output and the harness are served
const SERVED_DIRS = ['dist', 'tests/harness']

export const TOKEN = 'a'.repeat(44)

/** Storage for a signed-in account that needs no refresh requests on open */
export function signedIn(overrides = {}) {
  return {
    apiToken: TOKEN,
    instance: API,
    domain: 'addy.io',
    migratedFromSync: true,
    domainOptions: ['addy.io', 'anonaddy.me'],
    availableSharedDomains: ['addy.io', 'anonaddy.me'],
    recipients: [{ id: 'r1', email: 'me@example.com' }],
    labels: [{ id: 'l1', name: 'Shopping', colour: '#ff0000' }],
    lastDomainOptionsRefreshAt: Date.now(),
    lastRecipientsRefreshAt: Date.now(),
    lastLabelsRefreshAt: Date.now(),
    ...overrides,
  }
}

let nextId = 1
export function alias(fields = {}) {
  const id = `alias-${nextId++}`
  return {
    id,
    local_part: id,
    extension: null,
    domain: 'addy.io',
    description: null,
    active: true,
    pinned: false,
    deleted_at: null,
    labels: [],
    created_at: '2026-10-01 10:00:00',
    updated_at: '2026-10-01 10:00:00',
    emails_forwarded: 0,
    emails_blocked: 0,
    emails_replied: 0,
    emails_sent: 0,
    ...fields,
  }
}

export const email = (a) => `${a.local_part}@${a.domain}`

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: body === null ? '' : JSON.stringify(body),
  })
}

/**
 * A small in-memory addy.io API. Tests can read `requests`, change `aliases`,
 * or replace a handler with `on('METHOD /path', handler)`.
 */
function createFakeApi() {
  const api = {
    aliases: [],
    requests: [],
    created: [],
    handlers: new Map(),
    on(key, handler) {
      api.handlers.set(key, handler)
    },
  }

  const matchesSearch = (a, term) =>
    [a.local_part, a.description, email(a)].some((v) =>
      String(v || '')
        .toLowerCase()
        .includes(term.toLowerCase())
    )

  api.on('GET /api/v1/aliases', async (route, url) => {
    const search = url.searchParams.get('filter[search]') || ''
    const active = url.searchParams.get('filter[active]')
    let list = api.aliases.filter((a) => !search || matchesSearch(a, search))
    if (active === 'true') list = list.filter((a) => a.active)
    const size = Number(url.searchParams.get('page[size]') || 10)
    const data = list.slice(0, size)
    return json(route, { data, meta: { total: list.length }, links: { next: null } })
  })
  api.on('POST /api/v1/aliases', async (route, url, body) => {
    const created = alias({
      local_part: `new${api.created.length + 1}`,
      description: body.description || null,
    })
    api.created.push(created)
    api.aliases.unshift(created)
    return json(route, { data: created }, 201)
  })
  api.on('GET /api/v1/domain-options', (route) =>
    json(route, { data: ['addy.io'], defaultAliasDomain: 'addy.io', sharedDomains: ['addy.io'] })
  )
  api.on('GET /api/v1/recipients', (route) => json(route, { data: [] }))
  api.on('GET /api/v1/labels', (route) => json(route, { data: [] }))
  api.on('POST /api/v1/active-aliases', (route, url, body) => {
    const found = api.aliases.find((a) => a.id === body.id)
    if (found) found.active = true
    return json(route, { data: found })
  })
  api.on('DELETE /api/v1/active-aliases/:id', (route, url, body, id) => {
    const found = api.aliases.find((a) => a.id === id)
    if (found) found.active = false
    return json(route, null, 204)
  })

  return api
}

async function serveFile(route, relativePath) {
  const normalised = path.posix.normalize(relativePath)
  if (!SERVED_DIRS.some((dir) => normalised.startsWith(`${dir}/`))) {
    return route.fulfill({ status: 404, body: 'not served' })
  }
  try {
    const body = await fs.readFile(path.join(ROOT, normalised))
    return route.fulfill({
      body,
      contentType: CONTENT_TYPES[path.extname(normalised)] || 'application/octet-stream',
      headers: { 'access-control-allow-origin': '*' },
    })
  } catch {
    return route.fulfill({ status: 404, body: 'missing' })
  }
}

export const test = base.extend({
  api: async ({ context }, use) => {
    const api = createFakeApi()

    // Nothing leaves the machine. Routes added later take precedence.
    await context.route('**/*', (route) => route.abort())

    await context.route(`${EXT_ORIGIN}/**`, (route) =>
      serveFile(route, new URL(route.request().url()).pathname.slice(1))
    )

    await context.route(SIGNUP_URL, async (route) => {
      const html = (await fs.readFile(path.join(ROOT, 'tests/harness/page.html'), 'utf8'))
        .replaceAll('__HARNESS__', `${EXT_ORIGIN}/tests/harness`)
        .replaceAll('__DIST__', `${EXT_ORIGIN}/dist`)
      return route.fulfill({ body: html, contentType: 'text/html' })
    })

    await context.route(`${API}/**`, async (route) => {
      const request = route.request()
      if (request.method() === 'OPTIONS') {
        return route.fulfill({
          status: 204,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-headers': '*',
            'access-control-allow-methods': '*',
          },
        })
      }
      const url = new URL(request.url())
      const body = request.postDataJSON?.() ?? null
      api.requests.push({
        method: request.method(),
        path: url.pathname,
        url,
        body,
        authorization: request.headers().authorization || '',
      })

      const key = `${request.method()} ${url.pathname}`
      if (api.handlers.has(key)) return api.handlers.get(key)(route, url, body)
      // Handlers can end in :id to match one path segment
      for (const [pattern, handler] of api.handlers) {
        if (!pattern.endsWith('/:id')) continue
        const prefix = pattern.slice(0, -'/:id'.length)
        if (key.startsWith(`${prefix}/`) && !key.slice(prefix.length + 1).includes('/')) {
          return handler(route, url, body, key.slice(prefix.length + 1))
        }
      }
      return json(route, { message: `No fake for ${key}` }, 500)
    })

    await use(api)
  },
})

/** Open the popup with this storage. The tab it reports defaults to github.com. */
export async function openPopup(page, { local = {}, sync = {}, tabUrl } = {}) {
  await page.addInitScript(
    (config) => {
      window.__addyTest = config
    },
    { local, sync, tabUrl }
  )
  await page.goto(POPUP_URL)
}

/** Open the GitHub signup test page with the background and content scripts running. */
export async function openSignupPage(page, { local = signedIn(), sync = {} } = {}) {
  await page.addInitScript(
    (config) => {
      window.__addyTest = config
    },
    { local, sync }
  )
  await page.goto(SIGNUP_URL)
  // The icon appears once the content script has its image from the background
  await expect(page.locator('.addy-io-extension-icon').first()).toBeVisible()
}

export const storage = (page, area) => page.evaluate((a) => window.browser.storage[a]._data, area)
export const addyLog = (page) => page.evaluate(() => window.__addyLog)

export { expect }
