/**
 * One place for the headers every addy.io API call sends.
 * @param {{
 *   instance: string,
 *   path: string,
 *   apiToken?: string,
 *   method?: string,
 *   body?: object,
 *   signal?: AbortSignal
 * }} options
 * @returns {Promise<Response>}
 */
export function apiRequest({ instance, path, apiToken, method = 'GET', body, signal }) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Requested-From': 'browser-extension',
  }
  if (apiToken) headers.Authorization = `Bearer ${apiToken}`

  return fetch(`${instance}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })
}
