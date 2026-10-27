import { test, expect } from '@playwright/test'
import { listAliasesForSite, findAliasForSite } from '../src/assets/js/api/findAliasForSite.js'

// Unit tests: no browser, fetch is replaced with a canned search response.
const realFetch = globalThis.fetch
let searchResults = []
let lastUrl = null

test.beforeEach(() => {
  globalThis.fetch = async (url) => {
    lastUrl = new URL(url)
    return new Response(
      JSON.stringify({ data: searchResults, meta: { total: searchResults.length } })
    )
  }
})
test.afterEach(() => {
  globalThis.fetch = realFetch
})

const account = { instance: 'https://app.addy.io', apiToken: 'token' }
const alias = (local_part, description = null, extra = {}) => ({
  local_part,
  domain: 'addy.io',
  description,
  active: true,
  deleted_at: null,
  ...extra,
})

test.describe('listAliasesForSite (strict, used when filling a field)', () => {
  test.beforeEach(() => {
    searchResults = [
      alias('x1', 'github.com'),
      alias('x2', 'github.com work account'),
      alias('github.com'),
      alias('github'),
      alias('x3', 'mygithub.com'),
      alias('x4', 'notes about github.com'),
      alias('x5', 'github.com', { active: false }),
      alias('x6', 'github.com', { deleted_at: '2026-01-01' }),
    ]
  })

  const locals = (list) => list.map((a) => a.local_part)

  test('matches the hostname, the first word of the description and the local part', async () => {
    const found = await listAliasesForSite({ ...account, hostname: 'github.com' })
    expect(locals(found)).toEqual(['x1', 'x2', 'github.com'])
  })

  test('does not match the bare site name, which could be another TLD', async () => {
    searchResults = [alias('amazon', 'amazon.com'), alias('amazon')]
    expect(await listAliasesForSite({ ...account, hostname: 'www.amazon.support' })).toEqual([])
  })

  test('matches a subdomain through its registrable domain', async () => {
    const found = await listAliasesForSite({ ...account, hostname: 'www.github.com' })
    expect(locals(found)).toEqual(['x1', 'x2', 'github.com'])
  })

  test('treats www. and the bare domain as the same site, both ways', async () => {
    searchResults = [alias('x1', 'www.github.com'), alias('x2', 'github.com')]
    expect(locals(await listAliasesForSite({ ...account, hostname: 'github.com' }))).toEqual([
      'x1',
      'x2',
    ])
    expect(locals(await listAliasesForSite({ ...account, hostname: 'www.github.com' }))).toEqual([
      'x1',
      'x2',
    ])
  })

  test('does not match a lookalike site', async () => {
    const found = await listAliasesForSite({ ...account, hostname: 'ithub.com' })
    expect(found).toEqual([])
  })

  test('searches only active, undeleted aliases, newest first', async () => {
    await listAliasesForSite({ ...account, hostname: 'github.com' })
    expect(lastUrl.searchParams.get('filter[search]')).toBe('github.com')
    expect(lastUrl.searchParams.get('filter[active]')).toBe('true')
    expect(lastUrl.searchParams.get('filter[deleted]')).toBe('without')
    expect(lastUrl.searchParams.get('sort')).toBe('-created_at')
  })

  test('searches the registrable domain, so a subdomain finds the main site', async () => {
    await listAliasesForSite({ ...account, hostname: 'www.github.com' })
    expect(lastUrl.searchParams.get('filter[search]')).toBe('github.com')
    await listAliasesForSite({ ...account, hostname: 'gist.github.com' })
    expect(lastUrl.searchParams.get('filter[search]')).toBe('github.com')
  })

  test('returns nothing when the search fails', async () => {
    globalThis.fetch = async () => new Response('oops', { status: 500 })
    expect(await listAliasesForSite({ ...account, hostname: 'github.com' })).toEqual([])
  })

  test('throws on 401 so the caller can report it', async () => {
    globalThis.fetch = async () => new Response('{}', { status: 401 })
    await expect(listAliasesForSite({ ...account, hostname: 'github.com' })).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    })
  })
})

test.describe('findAliasForSite (loose, shown in the popup)', () => {
  test('returns the newest search result with its alias and the total', async () => {
    searchResults = [alias('x4', 'notes about github.com'), alias('x1', 'github.com')]
    const found = await findAliasForSite({ ...account, hostname: 'github.com' })
    expect(found).toMatchObject({
      email: 'x4@addy.io',
      alias: { local_part: 'x4' },
      count: 2,
      hasMore: false,
    })
  })

  test('returns no match for an empty search', async () => {
    searchResults = []
    expect(await findAliasForSite({ ...account, hostname: 'github.com' })).toMatchObject({
      email: '',
      alias: null,
      count: 0,
    })
  })
})
