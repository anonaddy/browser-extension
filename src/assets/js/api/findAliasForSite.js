import psl from 'psl'
import { formatAliasEmail } from './createAlias.js'

/**
 * Names that identify this site. Short registrable labels are omitted so a
 * search does not treat a generic word as a match.
 */
function siteNames(hostname) {
  const host = String(hostname || '')
    .trim()
    .toLowerCase()
  const names = new Set()
  if (!host) return names
  names.add(host)

  const parsed = psl.parse(host)
  const domain = parsed && typeof parsed.domain === 'string' ? parsed.domain.toLowerCase() : ''
  const sld = parsed && typeof parsed.sld === 'string' ? parsed.sld.toLowerCase() : ''
  if (domain) names.add(domain)
  if (sld.length >= 3) names.add(sld)
  return names
}

function aliasMatchesSite(alias, hostname) {
  if (!alias || alias.deleted_at || alias.active === false) return false
  const names = siteNames(hostname)
  const description = String(alias.description || '')
    .trim()
    .toLowerCase()
  const localPart = String(alias.local_part || '')
    .trim()
    .toLowerCase()
  return (description && names.has(description)) || (localPart && names.has(localPart))
}

const SEARCH_PAGE_SIZE = 10

/**
 * Look up active aliases for this site. Call this from a user action only.
 * Returns the newest strict match and how many matches were on the first page.
 * A failed search returns no match so alias creation can continue.
 * A 401 is thrown so the caller can show the login error.
 */
export async function findAliasForSite({ instance, apiToken, hostname }) {
  const empty = { email: '', count: 0, hasMore: false }
  const host = String(hostname || '').trim()
  if (!instance || !apiToken || !host) return empty

  const params = new URLSearchParams()
  params.set('filter[deleted]', 'without')
  params.set('filter[active]', 'true')
  params.set('filter[search]', host)
  params.set('sort', '-created_at')
  params.set('page[size]', String(SEARCH_PAGE_SIZE))

  const response = await fetch(`${instance}/api/v1/aliases?${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Requested-From': 'browser-extension',
      Authorization: `Bearer ${apiToken}`,
    },
  })

  if (response.status === 401) {
    const err = new Error('Unauthenticated')
    err.code = 'UNAUTHENTICATED'
    throw err
  }

  if (!response.ok) return empty

  const body = await response.json().catch(() => ({}))
  const aliases = Array.isArray(body.data) ? body.data : []
  const matches = aliases.filter((alias) => aliasMatchesSite(alias, host))
  if (!matches.length) return empty

  matches.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
  return {
    email: formatAliasEmail(matches[0]),
    count: matches.length,
    hasMore: matches.length === SEARCH_PAGE_SIZE,
  }
}
