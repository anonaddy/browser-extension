import psl from 'psl'
import { formatAliasEmail, UNAUTHENTICATED_MESSAGE } from './createAlias.js'
import { apiRequest } from './request.js'

/** The registrable domain, e.g. "example.com" for "www.example.com" */
function registrableDomain(host) {
  const parsed = psl.parse(host)
  return parsed && typeof parsed.domain === 'string' ? parsed.domain.toLowerCase() : ''
}

/**
 * What to search for to find this site's aliases. The search matches
 * substrings, so "www.example.com" would miss an alias described
 * "example.com"; the registrable domain finds both.
 */
export function siteSearchTerm(hostname) {
  const host = String(hostname || '')
    .trim()
    .toLowerCase()
  return registrableDomain(host) || host
}

/**
 * Names that identify this site: the hostname and its registrable domain.
 * The bare name ("example") is left out, since "example" on another TLD is a
 * different site.
 */
function siteNames(hostname) {
  const host = String(hostname || '')
    .trim()
    .toLowerCase()
  const names = new Set()
  if (!host) return names
  names.add(host)
  const domain = registrableDomain(host)
  if (domain) names.add(domain)
  return names
}

/**
 * The search matches substrings, so "ithub.com" finds a "github.com" alias.
 * A strict match needs the local part, or the first word of the description
 * (ignoring a leading "www."), to be one of this site's names.
 */
function aliasMatchesSite(alias, names) {
  if (!alias || alias.deleted_at || alias.active === false) return false
  // "www.example.com" and "example.com" are the same site
  const firstWord = String(alias.description || '')
    .trim()
    .toLowerCase()
    .split(/\s+/)[0]
    .replace(/^www\./, '')
  const localPart = String(alias.local_part || '')
    .trim()
    .toLowerCase()
  return (firstWord && names.has(firstWord)) || (localPart && names.has(localPart))
}

const SEARCH_PAGE_SIZE = 10

/**
 * Run the Aliases tab's text search for this site, newest first.
 * Returns the response body, or null when the search failed.
 * A 401 is thrown so the caller can show the login error.
 */
async function searchSiteAliases({ instance, apiToken, host }) {
  const params = new URLSearchParams()
  params.set('filter[deleted]', 'without')
  params.set('filter[active]', 'true')
  params.set('filter[search]', host)
  params.set('sort', '-created_at')
  params.set('page[size]', String(SEARCH_PAGE_SIZE))

  const response = await apiRequest({ instance, apiToken, path: `/api/v1/aliases?${params}` })

  if (response.status === 401) {
    const err = new Error(UNAUTHENTICATED_MESSAGE)
    err.code = 'UNAUTHENTICATED'
    throw err
  }

  if (!response.ok) return null
  return response.json().catch(() => null)
}

/**
 * Aliases that strictly match this site, newest first. Use this when an alias
 * may go into the page, since the plain search also matches lookalike sites.
 * Call this from a user action only. A failed search returns no aliases.
 */
export async function listAliasesForSite({ instance, apiToken, hostname }) {
  const host = String(hostname || '').trim()
  if (!instance || !apiToken || !host) return []

  const body = await searchSiteAliases({ instance, apiToken, host: siteSearchTerm(host) })
  const results = body && Array.isArray(body.data) ? body.data : []
  const names = siteNames(host)
  return results.filter((alias) => aliasMatchesSite(alias, names))
}

/**
 * Look up aliases for this site with the same text search as the Aliases tab.
 * A description such as "github.com username" counts, not only an exact name.
 * The popup shows the result to the user before it is used.
 * Call this from a user action only.
 * Returns the newest match (its address and the alias itself) and the search total.
 * A failed search returns no match so alias creation can continue.
 */
export async function findAliasForSite({ instance, apiToken, hostname }) {
  const empty = { email: '', alias: null, count: 0, hasMore: false }
  const host = String(hostname || '').trim()
  if (!instance || !apiToken || !host) return empty

  const body = await searchSiteAliases({ instance, apiToken, host: siteSearchTerm(host) })
  const aliases = body && Array.isArray(body.data) ? body.data : []
  if (!aliases.length) return empty

  const total = Number(body.meta && body.meta.total)
  const count = Number.isFinite(total) && total > 0 ? total : aliases.length

  return {
    email: formatAliasEmail(aliases[0]),
    alias: aliases[0],
    count,
    hasMore: count > SEARCH_PAGE_SIZE,
  }
}
