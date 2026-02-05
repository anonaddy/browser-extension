/**
 * Shared create-alias API for popup, background and content script.
 * POSTs to addy.io API and returns the created alias data or throws.
 */

/**
 * @param {{ local_part?: string, extension?: string, domain: string }} alias
 * @returns {string} Full alias email address
 */
export function formatAliasEmail(alias) {
  if (!alias) return ''
  return alias.extension
    ? `${alias.local_part}+${alias.extension}@${alias.domain}`
    : `${alias.local_part}@${alias.domain}`
}

/**
 * Create a new alias via the addy.io API.
 * @param {{
 *   instance: string,
 *   apiToken: string,
 *   domain: string,
 *   localPart?: string,
 *   description?: string,
 *   format: string,
 *   recipientIds?: string[]
 * }} options
 * @returns {Promise<{ data: object }>} Created alias data from API
 */
export async function createAliasRequest(options) {
  const {
    instance,
    apiToken,
    domain,
    localPart = '',
    description = '',
    format,
    recipientIds = [],
  } = options

  const response = await fetch(`${instance}/api/v1/aliases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Requested-From': 'browser-extension',
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({
      domain,
      local_part: localPart,
      description: description || undefined,
      format,
      recipient_ids: recipientIds,
    }),
  })

  const data = await response.json().catch(() => ({}))

  if (response.status === 201 && data.data) {
    return data
  }

  if (response.status === 401) {
    const err = new Error('Unauthenticated')
    err.code = 'UNAUTHENTICATED'
    throw err
  }
  if (response.status === 403) {
    throw new Error('You have reached your active shared domain alias limit')
  }
  if (response.status === 429) {
    throw new Error('You have reached your hourly limit for creating new aliases')
  }
  if (response.status === 422 && data.errors) {
    const firstKey = Object.keys(data.errors)[0]
    const message = firstKey ? data.errors[firstKey][0] : 'Validation failed'
    throw new Error(message)
  }

  throw new Error(data.message || 'An error occurred')
}
